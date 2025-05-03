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

interface HealthMetricTotals {
  calories: number;
  distance: number;
  steps: number;
  totalTimeSleep: number;
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
    healthDataDto: HealthDataDto,
  ): Promise<HealthData> {
    const user = await this.userRepository.findOne({ where: { watchId } });
    if (!user) {
      throw new NotFoundException(`User with watch id ${watchId} not found`);
    }

    let healthData = await this.healthDataRepository.findOne({
      where: { userId: user.id },
    });

    if (!healthData) {
      healthData = this.createNewHealthData(user.id, healthDataDto);
    } else {
      healthData = await this.updateExistingHealthData(
        healthData,
        healthDataDto,
      );
    }

    return this.healthDataRepository.save(healthData);
  }

  async getHealthDataByUserId(
    userId: String,
    period: TimePeriod,
  ): Promise<GetHealthDataResponseDto[]> {
    const bucketSize = this.getBucketSize(period);

    const queryBuilder = this.healthDataRepository
      .createQueryBuilder('healthData')
      .select([
        `time_bucket(:bucketSize, (dp->>'recordTime')::timestamp) AS bucket`,
        `AVG((dp->>'heartRate')::float) AS avg_heart_rate`,
        `AVG((dp->>'restHeartRate')::float) AS avg_rest_heart_rate`,
        // `AVG((dp->'afib'->>'val')::float) AS avg_afib_val`, // TODO: array
        `AVG((dp->>'bloodOxygen')::float) AS avg_blood_oxygen`,
        `SUM((dp->>'calories')::float) AS total_calories`,
        `SUM((dp->>'distance')::float) AS total_distance`,
        `AVG((dp->>'fatBurning')::float) AS avg_fat_burning`,
        `AVG((dp->>'pai')::float) AS avg_pai`,
        `AVG((dp->'sleepInfo'->>'score')::float) AS avg_sleep_score`,
        `SUM((dp->'sleepInfo'->>'totalTime')::float) AS total_sleep_time`,
        // `AVG((dp->'sleepingStage'->>>'model')::float) AS sleep_stage_type`, // TODO: array
        `AVG((dp->>'sleepingStatus')::float) AS sleeping_status`,
        `SUM((dp->>'steps')::float) AS total_steps`,
        `SUM((dp->>'stand')::float) AS total_stand`,
        `AVG((dp->>'stress')::float) AS avg_stress`,
      ])
      .from((subQuery) => {
        return subQuery
          .select(
            'healthData.userId, jsonb_array_elements(healthData.data) AS dp',
          )
          .from(HealthData, 'healthData')
          .where('healthData.userId = :userId', { userId });
      }, 'sub')
      .where(
        this.getTimeRangeCondition(period, "(dp->>'recordTime')::timestamp"),
      )
      .setParameter('bucketSize', bucketSize)
      .setParameter('userId', userId)
      .groupBy('bucket')
      .orderBy('bucket');

    const result = await queryBuilder.getRawMany();

    if (result.length === 0) {
      return [];
    }

    return result.map((item) => ({
      recordTime: item.bucket,
      avgHeartRate: item.avg_heart_rate,
      avgRestHeartRate: item.avg_rest_heart_rate,
      // "avgAfibVal": item.avg_afib_val,
      avgBloodOxygen: item.avg_blood_oxygen,
      totalCalories: item.total_calories,
      totalDistance: item.total_distance,
      avgFatBurning: item.avg_fat_burning,
      avgPai: item.avg_pai,
      avgSleepScore: item.avg_sleep_score,
      totalSleepTime: item.total_sleep_time,
      // "sleepStageType": item.sleep_stage_type,
      sleepingStatus: item.sleeping_status,
      totalSteps: item.total_steps,
      totalStand: item.total_stand,
      avgStress: item.avg_stress,
    }));
  }

  private createNewHealthData(
    userId: string,
    healthDataDto: HealthDataDto,
  ): HealthData {
    return this.healthDataRepository.create({
      ...healthDataDto,
      userId,
      data: [{ ...healthDataDto.data, recordTime: new Date() }],
    });
  }

  private async updateExistingHealthData(
    healthData: HealthData,
    healthDataDto: HealthDataDto,
  ): Promise<HealthData> {
    Object.assign(healthData, {
      watchName: healthDataDto.watchName,
      profile: healthDataDto.profile,
      battery: healthDataDto.battery,
    });

    const dailyTotals = this.calculateDailyTotals(healthData);

    healthData.data.push({
      ...healthDataDto.data,
      calories: healthDataDto.data.calories - dailyTotals.calories,
      distance: healthDataDto.data.distance - dailyTotals.distance,
      steps: healthDataDto.data.steps - dailyTotals.steps,
      sleepInfo: {
        ...healthDataDto.data.sleepInfo,
        totalTime:
          healthDataDto.data.sleepInfo.totalTime - dailyTotals.totalTimeSleep,
      },
      recordTime: new Date(),
    });
    return healthData;
  }

  private calculateDailyTotals(healthData: HealthData): HealthMetricTotals {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return healthData.data.reduce(
      (acc: HealthMetricTotals, dataPoint) => {
        const recordTime = new Date(dataPoint.recordTime);
        if (recordTime >= startOfDay) {
          acc.calories += dataPoint.calories;
          acc.distance += dataPoint.distance;
          acc.steps += dataPoint.steps;
          acc.totalTimeSleep += dataPoint.sleepInfo.totalTime;
        }
        return acc;
      },
      { calories: 0, distance: 0, steps: 0, totalTimeSleep: 0 },
    );
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

  private getTimeRangeCondition(
    timePeriod: TimePeriod,
    timeColumnExpression: string,
  ): string {
    switch (timePeriod) {
      case TimePeriod.DAY:
        return `${timeColumnExpression}::date = CURRENT_DATE`;
      case TimePeriod.WEEK:
        return `${timeColumnExpression} >= NOW() - INTERVAL '1 WEEK' AND ${timeColumnExpression} < NOW()`;
      case TimePeriod.MONTH:
        return `${timeColumnExpression} >= NOW() - INTERVAL '1 MONTH' AND ${timeColumnExpression} < NOW()`;
      case TimePeriod.SIX_MONTH:
        return `${timeColumnExpression} >= NOW() - INTERVAL '6 MONTH' AND ${timeColumnExpression} < NOW()`;
      case TimePeriod.YEAR:
        return `${timeColumnExpression} >= NOW() - INTERVAL '1 YEAR' AND ${timeColumnExpression} < NOW()`;
      default:
        throw new Error('Invalid time period');
    }
  }
}
