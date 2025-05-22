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

const bucketSizes = {
  [TimePeriod.DAY]: '5 minutes',
  [TimePeriod.WEEK]: '1 day',
  [TimePeriod.MONTH]: '1 day',
  [TimePeriod.SIX_MONTH]: '1 week',
  [TimePeriod.YEAR]: '1 month',
};

export type AllPeriodsHealthData = {
  [key in TimePeriod]: HealthDataPoint;
};

export type HealthDataPoint = {
  [date: string]: GetHealthDataResponseDto[];
};


interface HealthMetricTotals {
  calories: number;
  distance: number;
  steps: number;
  totalTimeSleep: number;
  stand: number;
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

  async getHealthDataByUserId(userId: string): Promise<AllPeriodsHealthData> {
    const queries = [
      {
        period: TimePeriod.DAY,
        query: this.createPeriodQuery(userId, bucketSizes[TimePeriod.DAY]),
      },
      {
        period: TimePeriod.WEEK,
        query: this.createPeriodQuery(userId, bucketSizes[TimePeriod.WEEK]),
      },
      {
        period: TimePeriod.MONTH,
        query: this.createPeriodQuery(userId, bucketSizes[TimePeriod.MONTH]),
      },
      {
        period: TimePeriod.SIX_MONTH,
        query: this.createPeriodQuery(
          userId,
          bucketSizes[TimePeriod.SIX_MONTH],
        ),
      },
      {
        period: TimePeriod.YEAR,
        query: this.createPeriodQuery(userId, bucketSizes[TimePeriod.YEAR]),
      },
    ];

    const results = await Promise.all(
      queries.map(({ query }) => query.getRawMany()),
    );

    const mapResults = (results: any[]): HealthDataPoint => {
      return results.reduce((formattedResults, result) => {
        const formattedDate = new Date(result.bucket)
          .toISOString()
          .split('T')[0];
        if (!formattedResults[formattedDate]) {
          formattedResults[formattedDate] = [];
        }
        formattedResults[formattedDate].push({
          recordTime: result.bucket,
          avgHeartRate: result.avg_heart_rate,
          avgRestHeartRate: result.avg_rest_heart_rate,
          avgBloodOxygen: result.avg_blood_oxygen,
          totalCalories: result.total_calories,
          totalDistance: result.total_distance,
          avgFatBurning: result.avg_fat_burning,
          avgPai: result.avg_pai,
          avgSleepScore: result.avg_sleep_score,
          totalSleepTime: result.total_sleep_time,
          sleepingStatus: result.sleeping_status,
          totalSteps: result.total_steps,
          totalStand: result.total_stand,
          avgStress: result.avg_stress,
        });
        return formattedResults;
      }, {} as HealthDataPoint);
    };

    const response: AllPeriodsHealthData = queries.reduce(
      (acc, { period }, index) => {
        acc[period] = mapResults(results[index]);
        return acc;
      },
      {} as AllPeriodsHealthData,
    );

    return response;
  }

  private createPeriodQuery(userId: string, bucketSize: string) {
    const queryBuilder = this.healthDataRepository
      .createQueryBuilder('healthData')
      .select([
        `time_bucket(:bucketSize, (dp->>'recordTime')::timestamp with time zone) AS bucket`,
        `AVG((dp->>'heartRate')::float) AS avg_heart_rate`,
        `AVG((dp->>'restHeartRate')::float) AS avg_rest_heart_rate`,
        // `AVG((dp->'afib'->>'val')::float) AS avg_afib_val`, // TODO: array
        `AVG((dp->>'bloodOxygen')::float) AS avg_blood_oxygen`,
        `SUM((dp->>'calories')::float) AS total_calories`, // 13:15 - 1 | 13:20 - 0 | 13:25 - 5 || OLD: 13:15 - 1  | 13:20 - 1 | 13:25 - 6
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
      .setParameter('bucketSize', bucketSize)
      .setParameter('userId', userId)
      .groupBy('bucket')
      .orderBy('bucket');

    return queryBuilder;
  }

  private createNewHealthData(
    userId: string,
    healthDataDto: HealthDataDto,
  ): HealthData {
    return this.healthDataRepository.create({
      ...healthDataDto,
      userId,
      data: [healthDataDto.data],
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
      stand: healthDataDto.data.stand - dailyTotals.stand,
      sleepInfo: {
        ...healthDataDto.data.sleepInfo,
        totalTime:
          healthDataDto.data.sleepInfo.totalTime - dailyTotals.totalTimeSleep,
      },
    });
    return healthData;
  }

  private calculateDailyTotals(healthData: HealthData): HealthMetricTotals {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return healthData.data.reduce(
      (acc: HealthMetricTotals, dataPoint) => {
        const recordTime = new Date(dataPoint.recordTime).toISOString();
        if (recordTime >= startOfDay.toISOString()) {
          acc.calories += dataPoint.calories;
          acc.distance += dataPoint.distance;
          acc.steps += dataPoint.steps;
          acc.totalTimeSleep += dataPoint.sleepInfo.totalTime;
          acc.stand += dataPoint.stand;
        }
        return acc;
      },
      { calories: 0, distance: 0, steps: 0, totalTimeSleep: 0, stand: 0 },
    );
  }
}
