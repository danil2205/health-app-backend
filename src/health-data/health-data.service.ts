import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HealthDataPoint } from './health-data-point.entity';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { GetHealthDataResponseDto } from './dto/responses/get-health-data-response.dto';
import {
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  addMonths,
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
  addWeeks,
  addYears,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { plainToInstance } from 'class-transformer';
import { HealthDataPointDto } from './dto/health-data-point.dto';

export enum TimePeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  SIX_MONTH = '6months',
  YEAR = 'year',
}

interface CumulativeMetrics {
  calories: number;
  distance: number;
  steps: number;
  totalTimeSleep: number;
  stand: number;
}

@Injectable()
export class HealthDataService {
  private readonly bucketSizes = {
    [TimePeriod.DAY]: '5 minutes',
    [TimePeriod.WEEK]: '1 day',
    [TimePeriod.MONTH]: '1 day',
    [TimePeriod.SIX_MONTH]: '1 week',
    [TimePeriod.YEAR]: '1 month',
  };

  constructor(
    @InjectRepository(HealthDataPoint)
    private healthDataRepository: Repository<HealthDataPoint>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async saveHealthData(
    watchId: string,
    healthDataPointDto: HealthDataPointDto,
  ): Promise<HealthDataPoint> {
    const user = await this.userRepository.findOne({ where: { watchId } });

    if (!user) {
      throw new NotFoundException(`User with watch id ${watchId} not found`);
    }

    const dailyTotals = await this.calculateDailyTotals(user.id);

    const healthDataPoint = this.createHealthDataPoint(
      user.id,
      healthDataPointDto,
      dailyTotals,
    );

    return await this.healthDataRepository.save(healthDataPoint);
  }

  async getDailyHealthDataPoints(
    userId: string,
    timezone: string,
    offset: number,
  ): Promise<HealthDataPoint[]> {
    const nowInUserTz = toZonedTime(new Date(), timezone);
    const targetDateInUserTz = addDays(nowInUserTz, offset);

    const startOfTargetDayInUserTz = startOfDay(targetDateInUserTz);
    const endOfTargetDayInUserTz = endOfDay(targetDateInUserTz);

    const startOfTargetDayUtc = fromZonedTime(
      startOfTargetDayInUserTz,
      timezone,
    );
    const endOfTargetDayUtc = fromZonedTime(endOfTargetDayInUserTz, timezone);

    const healthData = await this.healthDataRepository
      .createQueryBuilder('hdp')
      .where('hdp.userId = :userId', { userId })
      .andWhere('hdp.recordTime >= :startOfDay', {
        startOfDay: startOfTargetDayUtc,
      })
      .andWhere('hdp.recordTime <= :endOfDay', { endOfDay: endOfTargetDayUtc })
      .orderBy('hdp.recordTime', 'ASC')
      .getMany();

    return plainToInstance(HealthDataPoint, healthData);
  }

  async getHealthDataByPeriod(
    userId: string,
    timezone: string,
    period: TimePeriod,
    offset: number,
  ): Promise<GetHealthDataResponseDto[]> {
    const bucketSize = this.bucketSizes[period];
    const nowInUserTz = toZonedTime(new Date(), timezone);

    let startDateInUserTz: Date;
    let endDateInUserTz: Date;

    switch (period) {
      case 'week': {
        const targetWeekStart = startOfWeek(addWeeks(nowInUserTz, offset), {
          weekStartsOn: 1,
        });

        startDateInUserTz = startOfDay(targetWeekStart);
        endDateInUserTz = endOfDay(
          endOfWeek(targetWeekStart, { weekStartsOn: 1 }),
        );
        break;
      }

      case 'month': {
        const targetMonthStart = startOfMonth(addMonths(nowInUserTz, offset));
        startDateInUserTz = startOfDay(targetMonthStart);
        endDateInUserTz = endOfDay(endOfMonth(targetMonthStart));
        break;
      }

      case '6months': {
        const targetStart = startOfMonth(addMonths(nowInUserTz, offset * 6));
        const targetEnd = endOfMonth(addMonths(targetStart, 5));
        startDateInUserTz = startOfDay(targetStart);
        endDateInUserTz = endOfDay(targetEnd);
        break;
      }

      case 'year': {
        const targetYearStart = startOfYear(addYears(nowInUserTz, offset));
        startDateInUserTz = startOfDay(targetYearStart);
        endDateInUserTz = endOfDay(endOfYear(targetYearStart));
        break;
      }

      default:
        throw new Error(`Unsupported period: ${period}`);
    }

    const startUtc = fromZonedTime(startDateInUserTz, timezone);
    const endUtc = fromZonedTime(endDateInUserTz, timezone);

    const query = `
    SELECT
      time_bucket($1, record_time AT TIME ZONE $2) AS bucket,
      AVG(heart_rate) FILTER (WHERE heart_rate IS NOT NULL AND heart_rate > 0 AND heart_rate < 255) AS avg_heart_rate,
      AVG(rest_heart_rate) FILTER (WHERE rest_heart_rate IS NOT NULL AND rest_heart_rate > 0 AND rest_heart_rate < 255) AS avg_rest_heart_rate,
      AVG(blood_oxygen) FILTER (WHERE blood_oxygen IS NOT NULL AND blood_oxygen > 0 AND blood_oxygen < 100) AS avg_blood_oxygen,
      AVG(stress) FILTER (WHERE stress IS NOT NULL AND stress > 0 AND stress < 255 AND stress BETWEEN 1 AND 100) AS avg_stress,
      SUM(calories) AS total_calories,
      SUM(distance) AS total_distance,
      AVG(fat_burning) AS avg_fat_burning,
      AVG(pai) AS avg_pai,
      AVG((sleep_info->>'score')::float) AS avg_sleep_score,
      SUM(steps) AS total_steps,
      SUM(stand) AS total_stand
    FROM health_data_points
    WHERE user_id = $3
        AND record_time > $4 
        AND record_time <= $5
    GROUP BY bucket
    ORDER BY bucket;
  `;

    const healthData = await this.healthDataRepository.query(query, [
      bucketSize,
      timezone,
      userId,
      startUtc,
      endUtc,
    ]);

    return healthData.map((result) => {
      if (!result.bucket) return;

      return {
        recordTime: new Date(result.bucket),
        heartRate: parseInt(result.avg_heart_rate),
        restHeartRate: parseInt(result.avg_rest_heart_rate),
        bloodOxygen: parseInt(result.avg_blood_oxygen),
        calories: parseInt(result.total_calories),
        distance: parseInt(result.total_distance),
        fatBurning: parseInt(result.avg_fat_burning),
        pai: parseInt(result.avg_pai),
        sleepScore: parseInt(result.avg_sleep_score),
        steps: parseInt(result.total_steps),
        stand: parseInt(result.total_stand),
        stress: parseInt(result.avg_stress),
      };
    });
  }

  private createHealthDataPoint(
    userId: string,
    healthDataPointDto: HealthDataPointDto,
    dailyTotals: CumulativeMetrics,
  ): HealthDataPoint {
    return this.healthDataRepository.create({
      userId,
      recordTime: new Date(healthDataPointDto.recordTime),
      heartRate: healthDataPointDto.heartRate,
      restHeartRate: healthDataPointDto.restHeartRate,
      bloodOxygen: healthDataPointDto.bloodOxygen,
      stress: healthDataPointDto.stress,
      fatBurning: healthDataPointDto.fatBurning,
      pai: healthDataPointDto.pai,
      sleepingStatus: healthDataPointDto.sleepingStatus,
      calories: Math.max(0, healthDataPointDto.calories - dailyTotals.calories),
      distance: Math.max(0, healthDataPointDto.distance - dailyTotals.distance),
      steps: Math.max(0, healthDataPointDto.steps - dailyTotals.steps),
      stand: Math.max(0, healthDataPointDto.stand - dailyTotals.stand),
      sleepInfo: healthDataPointDto.sleepInfo,
      sleepStage: healthDataPointDto.sleepStage,
      sleepNap: healthDataPointDto.sleepNap,
      afib: healthDataPointDto.afib,
    });
  }

  private async calculateDailyTotals(
    userId: string,
  ): Promise<CumulativeMetrics> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const query = `
      SELECT 
        SUM(calories) as calories,
        SUM(distance) as distance,
        SUM(steps) as steps,
        SUM(stand) as stand,
        SUM((sleep_info->>'totalTime')::integer) as sleep_time
      FROM health_data_points 
      WHERE user_id = $1 
        AND record_time > $2 
        AND record_time <= $3
    `;

    const result = await this.healthDataRepository.query(query, [
      userId,
      startOfDay.toISOString(),
      endOfDay.toISOString(),
    ]);

    return result[0];
  }
}
