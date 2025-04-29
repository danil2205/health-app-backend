import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HealthData } from './health-data.entity';
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

@Injectable()
export class HealthDataService {
  constructor(
    @InjectRepository(HealthData)
    private healthDataRepository: Repository<HealthData>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async saveHealthData(
    watchId: string,
    healthData: HealthDataDto,
  ): Promise<HealthData> {
    const user = await this.userRepository.findOne({ where: { watchId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const healthDataEntity = healthData as HealthData;
    healthDataEntity.userId = user.id;

    return this.healthDataRepository.save(healthData);
  }

  async getHealthDataByUserId(
    userId: String,
    period: TimePeriod,
  ): Promise<GetHealthDataResponseDto[]> {
    const bucketSize = this.getBucketSize(period);
    const timeRangeCondition = this.getTimeRangeCondition(period);

    const queryBuilder = this.healthDataRepository
      .createQueryBuilder('health_data')
      .select(`time_bucket('${bucketSize}', record_time)`, 'bucket')
      .addSelect('AVG(heart_rate)', 'avg_heart_rate')
      .addSelect(`AVG((blood_oxygen->>'value')::int)`, 'avg_blood_oxygen')
      .addSelect('SUM(calories)', 'total_calories')
      .addSelect('SUM(distance)', 'total_distance')
      .addSelect('AVG(fat_burning)', 'avg_fat_burning')
      .addSelect('AVG(pai)', 'avg_pai')
      .addSelect(`AVG((sleep_info->>'score')::int)`, 'avg_sleep_score')
      .addSelect(`SUM((sleep_info->>'totalTime')::int)`, 'total_sleep_time')
      .addSelect('SUM(steps)', 'total_steps')
      .addSelect(`AVG((stress->>'value')::int)`, 'avg_stress')
      .where('user_id = :userId', { userId })
      .andWhere(timeRangeCondition)
      .groupBy('bucket')
      .orderBy('bucket');

    const result = await queryBuilder.getRawMany();

    if (result.length === 0) {
      throw new NotFoundException('No health data found');
    }

    return result.map((item) => ({
      recordTime: item.bucket,
      avgHeartRate: item.avg_heart_rate,
      avgBloodOxygen: item.avg_blood_oxygen,
      totalCalories: item.total_calories,
      totalDistance: item.total_distance,
      avgFatBurning: item.avg_fat_burning,
      avgPai: item.avg_pai,
      avgSleepScore: item.avg_sleep_score,
      totalSleepTime: item.total_sleep_time,
      // "sleepingStatus": item.sleeping_status,
      totalSteps: item.total_steps,
      avgStress: item.avg_stress,
      // "wearStatus": item.wear_status,
    }));
  }

  private getBucketSize(timePeriod: TimePeriod): string {
    switch (timePeriod) {
      case TimePeriod.DAY:
        return '5 MINUTES';
      case TimePeriod.WEEK:
        return '1 DAY';
      case TimePeriod.MONTH:
        return '1 DAY';
      case TimePeriod.SIX_MONTH:
        return '1 WEEK';
      case TimePeriod.YEAR:
        return '1 MONTH';
      default:
        throw new Error('Invalid time period');
    }
  }

  private getTimeRangeCondition(timePeriod: TimePeriod): string {
    switch (timePeriod) {
      case TimePeriod.DAY:
        return `record_time >= DATE_TRUNC('day', NOW()) AND record_time < DATE_TRUNC('day', NOW()) + INTERVAL '1 DAY'`;
      case TimePeriod.WEEK:
        return `record_time >= DATE_TRUNC('week', NOW()) AND record_time < DATE_TRUNC('week', NOW()) + INTERVAL '7 DAY'`;
      case TimePeriod.MONTH:
        return `record_time >= DATE_TRUNC('month', NOW()) AND record_time < DATE_TRUNC('month', NOW()) + INTERVAL '1 MONTH'`;
      case TimePeriod.SIX_MONTH:
        return `record_time >= DATE_TRUNC('month', NOW() - INTERVAL '5 MONTH') AND record_time < DATE_TRUNC('month', NOW()) + INTERVAL '1 MONTH'`;
      case TimePeriod.YEAR:
        return `record_time >= DATE_TRUNC('year', NOW()) AND record_time < DATE_TRUNC('year', NOW()) + INTERVAL '1 YEAR'`;
      default:
        throw new Error('Invalid time period');
    }
  }
}