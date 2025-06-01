import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HealthDataPoint } from './health-data.entity';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { GetHealthDataResponseDto } from './dto/responses/get-health-data-response.dto';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { plainToInstance } from 'class-transformer';
import { HealthDataPointDto } from './dto/health-data-point.dto';

export enum TimePeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  SIX_MONTH = '6months',
  YEAR = 'year',
}

export type DailyGroupedHealthData = {
  [date: string]: GetHealthDataResponseDto[];
};

export type AllPeriodsHealthData = {
  [key in TimePeriod]: DailyGroupedHealthData;
};

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

  async getHealthDataByUserId(
    userId: string,
    userTimezone: string = 'UTC',
  ): Promise<AllPeriodsHealthData> {
    const periods = Object.values(TimePeriod) as TimePeriod[];
    const results = await Promise.all(
      periods.map((period) =>
        this.getHealthDataByPeriod(userId, period, userTimezone),
      ),
    );

    return periods.reduce((acc, period, idx) => {
      acc[period] = results[idx];
      return acc;
    }, {} as AllPeriodsHealthData);
  }

  async getDailyHealthDataPoints(
    userId: string,
    userTimezone: string,
    dayOffset: number = 0,
  ): Promise<HealthDataPoint[]> {
    const nowInUserTz = toZonedTime(new Date(), userTimezone);

    const targetDateInUserTz = addDays(nowInUserTz, dayOffset);

    const startOfTargetDayInUserTz = startOfDay(targetDateInUserTz);
    const endOfTargetDayInUserTz = endOfDay(targetDateInUserTz);

    const startOfTargetDayUtc = fromZonedTime(
      startOfTargetDayInUserTz,
      userTimezone,
    );
    const endOfTargetDayUtc = fromZonedTime(
      endOfTargetDayInUserTz,
      userTimezone,
    );

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
    period: TimePeriod,
    userTimezone: string,
  ): Promise<DailyGroupedHealthData> {
    const bucketSize = this.bucketSizes[period];

    if (!bucketSize) {
      throw new BadRequestException(`Invalid time period: ${period}`);
    }

    let sleepData = '';

    if (period === TimePeriod.DAY) {
      sleepData = `, (array_agg(sleep_stage ORDER BY record_time DESC))[1] AS sleep_stage_data`;
    }

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
        SUM((sleep_info->>'totalTime')::float) AS total_sleep_time,
        AVG(sleeping_status) AS sleeping_status,
        SUM(steps) AS total_steps,
        SUM(stand) AS total_stand
        ${sleepData}
      FROM health_data_points
      WHERE user_id = $3
      GROUP BY bucket
      ORDER BY bucket;
    `;

    const results = await this.healthDataRepository.query(query, [
      bucketSize,
      userTimezone,
      userId,
    ]);

    return this.mapResultsToGroupedData(results);
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

  private mapResultsToGroupedData(results: any[]): DailyGroupedHealthData {
    const groupedData: DailyGroupedHealthData = {};

    results.forEach((result) => {
      if (!result.bucket) return;

      const recordTime = new Date(result.bucket);
      const yyyy = recordTime.getFullYear();
      const mm = String(recordTime.getMonth() + 1).padStart(2, '0');
      const dd = String(recordTime.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      if (!groupedData[dateKey]) {
        groupedData[dateKey] = [];
      }

      const dataPoint: GetHealthDataResponseDto = {
        recordTime,
        avgHeartRate: parseFloat(result.avg_heart_rate),
        avgRestHeartRate: parseFloat(result.avg_rest_heart_rate),
        avgBloodOxygen: parseFloat(result.avg_blood_oxygen),
        totalCalories: parseFloat(result.total_calories),
        totalDistance: parseFloat(result.total_distance),
        avgFatBurning: parseFloat(result.avg_fat_burning),
        avgPai: parseFloat(result.avg_pai),
        avgSleepScore: parseFloat(result.avg_sleep_score),
        totalSleepTime: parseFloat(result.total_sleep_time),
        sleepingStatus: parseFloat(result.sleeping_status),
        totalSteps: parseFloat(result.total_steps),
        totalStand: parseFloat(result.total_stand),
        avgStress: parseFloat(result.avg_stress),
        sleepStageData: result.sleep_stage_data,
      };

      groupedData[dateKey].push(dataPoint);
    });

    return groupedData;
  }
}
