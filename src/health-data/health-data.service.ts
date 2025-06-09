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
  startOfWeek,
  endOfWeek,
  addMonths,
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
  addWeeks,
  addYears,
  subWeeks,
  format,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { plainToInstance } from 'class-transformer';
import { HealthDataPointDto } from './dto/health-data-point.dto';
import { GetHighlightDataResponseDto } from './dto/responses/get-highlight-data-response.dto';

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
      .orderBy('hdp.recordTime')
      .getMany();

    const cleanedHealthData = healthData.map((hd) => ({
      ...hd,
      heartRate: this.validateValue(hd.heartRate, 1, 254),
      restHeartRate: this.validateValue(hd.restHeartRate, 1, 254),
      bloodOxygen: this.validateValue(hd.bloodOxygen, 1, 99),
      stress: this.validateValue(hd.stress, 1, 100),
    }));

    return plainToInstance(HealthDataPoint, cleanedHealthData);
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
        const endReferenceDate = startOfMonth(
          addMonths(nowInUserTz, offset * 6),
        );
        endDateInUserTz = endOfDay(endOfMonth(endReferenceDate));
        startDateInUserTz = startOfDay(
          startOfMonth(addMonths(endReferenceDate, -5)),
        );
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
        heartRate: this.validateValue(result.avg_heart_rate, 1, 254),
        restHeartRate: this.validateValue(result.avg_rest_heart_rate, 1, 254),
        bloodOxygen: this.validateValue(result.avg_blood_oxygen, 1, 99),
        calories: parseInt(result.total_calories),
        distance: parseInt(result.total_distance),
        fatBurning: parseInt(result.avg_fat_burning),
        pai: parseInt(result.avg_pai),
        sleepScore: parseInt(result.avg_sleep_score),
        steps: parseInt(result.total_steps),
        stand: parseInt(result.total_stand),
        stress: this.validateValue(result.avg_stress, 1, 100),
      };
    });
  }

  async getHighlightData(
    userId: string,
    timezone: TimePeriod,
  ): Promise<GetHighlightDataResponseDto> {
    const typicalData = await this.getHighlightTypicalValueData(
      userId,
      timezone,
    );

    const monthProgressData = await this.getHighlightTimeProgressData(
      userId,
      timezone,
      TimePeriod.MONTH,
    );

    const yearProgressData = await this.getHighlightTimeProgressData(
      userId,
      timezone,
      TimePeriod.YEAR,
    );

    const avgMetricData = await this.getHighlightAvgMetricData(
      userId,
      timezone,
    );

    return {
      typicalData,
      monthProgressData,
      yearProgressData,
      avgMetricData,
    };
  }

  async getHighlightTypicalValueData(userId: string, timezone: string) {
    const nowInUserTz = toZonedTime(new Date(), timezone);
    const fiveWeeksAgoInUserTz = subWeeks(nowInUserTz, 5);

    const startDateUtc = fromZonedTime(
      startOfDay(fiveWeeksAgoInUserTz),
      timezone,
    );

    const data = await this.healthDataRepository
      .createQueryBuilder('hdp')
      .where('hdp.userId = :userId', { userId })
      .andWhere('hdp.recordTime >= :startDate', { startDate: startDateUtc })
      .orderBy('hdp.recordTime')
      .getMany();

    if (data.length === 0) return {};

    const dayData: Record<string, HealthDataPoint[]> = {};
    for (const point of data) {
      const dateKey = format(
        toZonedTime(point.recordTime, timezone),
        'yyyy-MM-dd',
      );
      if (!dayData[dateKey]) {
        dayData[dateKey] = [];
      }
      dayData[dateKey].push(point);
    }

    return dayData;
  }

  async getHighlightTimeProgressData(
    userId: string,
    timezone: string,
    period: TimePeriod,
  ) {
    const curHealthData = await this.getHealthDataByPeriod(
      userId,
      timezone,
      period,
      0,
    );

    const prevHealthData = await this.getHealthDataByPeriod(
      userId,
      timezone,
      period,
      -1,
    );

    return {
      currentData: curHealthData,
      previousData: prevHealthData,
    };
  }

  async getHighlightAvgMetricData(userId: string, timezone: string) {
    const lastWeekHealthData = await this.getHealthDataByPeriod(
      userId,
      timezone,
      TimePeriod.WEEK,
      0,
    );

    return lastWeekHealthData;
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

  private validateValue(
    value: number,
    min: number,
    max: number,
  ): number | null {
    return value >= min && value <= max ? ~~value : null;
  }
}
