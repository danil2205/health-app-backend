import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HealthDataPoint, UserDevice } from './entity/health-data.entity';
import { Repository } from 'typeorm';
import { HealthDataDto } from './dto/health-data.dto';
import { User } from '../users/users.entity';
import { GetHealthDataResponseDto } from './dto/responses/get-health-data-response.dto';

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
    @InjectRepository(UserDevice)
    private readonly userDeviceRepository: Repository<UserDevice>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async updateUserDevice(
    userId: string,
    healthDataDto: HealthDataDto,
  ): Promise<void> {
    let userDevice = await this.userDeviceRepository.findOne({
      where: { userId },
    });

    if (!userDevice) {
      userDevice = this.userDeviceRepository.create({
        userId,
        watchName: healthDataDto.watchName,
        profile: healthDataDto.profile,
        battery: healthDataDto.battery,
      });
    } else {
      Object.assign(userDevice, {
        watchName: healthDataDto.watchName,
        profile: healthDataDto.profile,
        battery: healthDataDto.battery,
      });
    }

    await this.userDeviceRepository.save(userDevice);
  }

  async saveHealthData(
    watchId: string,
    healthDataDto: HealthDataDto,
  ): Promise<HealthDataPoint> {
    const user = await this.userRepository.findOne({ where: { watchId } });

    if (!user) {
      throw new NotFoundException(`User with watch id ${watchId} not found`);
    }

    await this.updateUserDevice(user.id, healthDataDto);

    const dailyTotals = await this.calculateDailyTotals(user.id);

    const healthDataPoint = this.createHealthDataPoint(
      user.id,
      healthDataDto,
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

  async getHealthDataByPeriod(
    userId: string,
    period: TimePeriod,
    userTimezone: string,
  ): Promise<DailyGroupedHealthData> {
    const bucketSize = this.bucketSizes[period];

    if (!bucketSize) {
      throw new BadRequestException(`Invalid time period: ${period}`);
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

    return this.mapResultsToGroupedData(results, userTimezone);
  }

  private createHealthDataPoint(
    userId: string,
    healthDataDto: HealthDataDto,
    dailyTotals: CumulativeMetrics,
  ): HealthDataPoint {
    const dataPoint = healthDataDto.data;

    return this.healthDataRepository.create({
      userId,
      recordTime: new Date(dataPoint.recordTime),
      heartRate: dataPoint.heartRate,
      restHeartRate: dataPoint.restHeartRate,
      bloodOxygen: dataPoint.bloodOxygen,
      stress: dataPoint.stress,
      fatBurning: dataPoint.fatBurning,
      pai: dataPoint.pai,
      sleepingStatus: dataPoint.sleepingStatus,
      calories: Math.max(0, dataPoint.calories - dailyTotals.calories),
      distance: Math.max(0, dataPoint.distance - dailyTotals.distance),
      steps: Math.max(0, dataPoint.steps - dailyTotals.steps),
      stand: Math.max(0, dataPoint.stand - dailyTotals.stand),
      sleepInfo: dataPoint.sleepInfo,
      sleepStage: dataPoint.sleepStage,
      sleepNap: dataPoint.sleepNap,
      afib: dataPoint.afib,
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

  private mapResultsToGroupedData(
    results: any[],
    userTimezone: string,
  ): DailyGroupedHealthData {
    const groupedData: DailyGroupedHealthData = {};

    results.forEach((result) => {
      if (!result.bucket) return;

      const recordTime = new Date(result.bucket);
      const dateKey = this.convertUtcToZonedDate(recordTime, userTimezone);

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
      };

      groupedData[dateKey].push(dataPoint);
    });

    return groupedData;
  }

  private convertUtcToZonedDate(utcDate: Date, timeZone: string): string {
    const zonedTimeString = utcDate.toLocaleString('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false,
    });

    const dateKey = zonedTimeString.split(',')[0];

    return dateKey;
  }
}
