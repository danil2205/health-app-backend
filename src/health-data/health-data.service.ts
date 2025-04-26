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

  async getHealthDataByUserId(userId: String, period: TimePeriod): Promise<GetHealthDataResponseDto[]> {
    const interval = this.getInterval(period);
    const bucketSize = this.getBucketSize(period);

    const queryBuilder = this.healthDataRepository
      .createQueryBuilder('health_data')
      .select(`time_bucket('${bucketSize}', record_time)`, 'bucket')
      .addSelect('AVG(heart_rate)', 'avg_heart_rate')
      .addSelect(`AVG((blood_oxygen->>'value')::int)`, 'avg_blood_oxygen')
      .addSelect('AVG(calories)', 'avg_calories') // mb sum
      .addSelect('AVG(distance)', 'avg_distance') // mb sum
      .addSelect('AVG(fat_burning)', 'avg_fat_burning')
      .addSelect('AVG(pai)', 'avg_pai')
      .addSelect(`AVG((sleep_info->>'score')::int)`, 'avg_sleep_score')
      .addSelect(`SUM((sleep_info->>'totalTime')::int)`, 'avg_sleep_total_time')
      .addSelect('SUM(steps)', 'total_steps')
      .addSelect(`AVG((stress->>'value')::int)`, 'avg_stress')
      .where('user_id = :userId', { userId })
      .andWhere(`record_time >= NOW() - INTERVAL '${interval}'`)
      .groupBy('bucket')
      .orderBy('bucket');

    const result = await queryBuilder.getRawMany();

    if (result.length === 0) {
      throw new NotFoundException('No health data found');
    }

    return result.map((item) => ({
      "recordTime": item.bucket,
      "avgHeartRate": item.avg_heart_rate,
      "avgBloodOxygen": item.avg_blood_oxygen,
      "avgCalories": item.avg_calories,
      "avgDistance": item.avg_distance,
      "avgFatBurning": item.avg_fat_burning,
      "avgPai": item.avg_pai,
      "avgSleepScore": item.avg_sleep_score,
      "avgSleepTotalTime": item.avg_sleep_total_time,
      "sleepingStatus": item.sleeping_status,
      "totalSteps": item.total_steps,
      "avgStress": item.avg_stress,
      "wearStatus": item.wear_status,
    }));
  }

  private getInterval(timePeriod: TimePeriod): string {
    switch (timePeriod) {
      case TimePeriod.DAY:
        return '1 DAY';
      case TimePeriod.WEEK:
        return '7 DAY';
      case TimePeriod.MONTH:
        return '30 DAY';
      case TimePeriod.SIX_MONTH:
        return '180 DAY';
      case TimePeriod.YEAR:
        return '365 DAY';
      default:
        throw new Error('Invalid time period');
    }
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
}
