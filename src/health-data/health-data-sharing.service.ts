import { ForbiddenException, Injectable } from '@nestjs/common';
import { UpdateHealthSharingDto } from './dto/requests/update-health-sharing.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserFriends, FriendshipStatus } from '../friends/user-friends.entity';
import { Repository } from 'typeorm';
import { HealthDataService, TimePeriod } from './health-data.service';
import { GetHealthDataResponseDto } from './dto/responses/get-health-data-response.dto';
import { HealthDataPoint } from './health-data-point.entity';
import {
  GetHighlightDataResponseDto,
  HealthDataSet,
} from './dto/responses/get-highlight-data-response.dto';

export enum HealthMetric {
  HEART_RATE = 'heart_rate',
  REST_HEART_RATE = 'rest_heart_rate',
  BLOOD_OXYGEN = 'blood_oxygen',
  CALORIES = 'calories',
  DISTANCE = 'distance',
  FAT_BURNING = 'fat_burning',
  PAI = 'pai',
  SLEEP_DATA = 'sleep_data',
  STEPS = 'steps',
  STAND = 'stand',
  STRESS = 'stress',
}

@Injectable()
export class HealthDataSharingService {
  private readonly metricToPropertyMap: Record<
    HealthMetric,
    keyof GetHealthDataResponseDto | (keyof GetHealthDataResponseDto)[]
  > = {
    [HealthMetric.HEART_RATE]: 'heartRate',
    [HealthMetric.REST_HEART_RATE]: 'restHeartRate',
    [HealthMetric.BLOOD_OXYGEN]: 'bloodOxygen',
    [HealthMetric.CALORIES]: 'calories',
    [HealthMetric.DISTANCE]: 'distance',
    [HealthMetric.FAT_BURNING]: 'fatBurning',
    [HealthMetric.PAI]: 'pai',
    [HealthMetric.SLEEP_DATA]: ['sleepScore', 'sleepInfo', 'sleepStage'],
    [HealthMetric.STEPS]: 'steps',
    [HealthMetric.STAND]: 'stand',
    [HealthMetric.STRESS]: 'stress',
  };

  constructor(
    @InjectRepository(UserFriends)
    private readonly userFriendsRepository: Repository<UserFriends>,
    private readonly healthDataService: HealthDataService,
  ) {}

  async updateSharedMetrics(
    userId: string,
    updateDto: UpdateHealthSharingDto,
  ): Promise<{ success: boolean; message: string }> {
    const friendship = await this.getFriendship(userId, updateDto.friendId);

    if (friendship.requesterId === userId) {
      friendship.requesterSharedMetrics = updateDto.sharedMetrics;
    } else {
      friendship.receiverSharedMetrics = updateDto.sharedMetrics;
    }

    await this.userFriendsRepository.save(friendship);

    return {
      success: true,
      message: 'Shared metrics updated successfully',
    };
  }

  async getFriendDailyHealthData(
    userId: string,
    friendId: string,
    offset: number,
    timezone: string,
  ): Promise<Partial<HealthDataPoint>[]> {
    const friendship = await this.getFriendship(userId, friendId);
    const sharedMetrics = this.getSharedMetrics(friendship, userId);

    if (sharedMetrics.length === 0) return [];

    const healthData = await this.healthDataService.getDailyHealthDataPoints(
      friendId,
      timezone,
      offset,
    );

    return this.filterHealthDataByMetrics(healthData, sharedMetrics);
  }

  async getFriendHealthData(
    userId: string,
    friendId: string,
    timezone: string,
    period: TimePeriod,
    offset: number,
  ): Promise<Partial<GetHealthDataResponseDto>[]> {
    const friendship = await this.getFriendship(userId, friendId);
    const sharedMetrics = this.getSharedMetrics(friendship, userId);

    if (sharedMetrics.length === 0) return [];

    const healthData = await this.healthDataService.getHealthDataByPeriod(
      friendId,
      timezone,
      period,
      offset,
    );

    return this.filterHealthDataByMetrics(healthData, sharedMetrics);
  }

  async getFriendHighlightHealthData(
    userId: string,
    friendId: string,
    timezone: TimePeriod,
  ): Promise<GetHighlightDataResponseDto> {
    const friendship = await this.getFriendship(userId, friendId);
    const sharedMetrics = this.getSharedMetrics(friendship, userId);

    if (sharedMetrics.length === 0) {
      return {
        typicalData: {},
        monthProgressData: { currentData: [], previousData: [] },
        yearProgressData: { currentData: [], previousData: [] },
        avgMetricData: [],
      };
    }

    const highlightData = await this.healthDataService.getHighlightData(
      friendId,
      timezone,
    );

    const filteredTypicalData: Record<string, Partial<HealthDataPoint>[]> = {};
    for (const key in highlightData.typicalData) {
      filteredTypicalData[key] = this.filterHealthDataByMetrics(
        highlightData.typicalData[key],
        sharedMetrics,
      );
    }

    const filteredMonthProgressData = this.filterProgressData(
      highlightData.monthProgressData,
      sharedMetrics,
    );
    const filteredYearProgressData = this.filterProgressData(
      highlightData.yearProgressData,
      sharedMetrics,
    );
    const filteredAvgMetricData = this.filterHealthDataByMetrics(
      highlightData.avgMetricData,
      sharedMetrics,
    );

    return {
      typicalData: filteredTypicalData,
      monthProgressData: filteredMonthProgressData,
      yearProgressData: filteredYearProgressData,
      avgMetricData: filteredAvgMetricData,
    };
  }

  async getMySharedMetricsForFriend(
    userId: string,
    friendId: string,
  ): Promise<HealthMetric[]> {
    const friendship = await this.getFriendship(userId, friendId);

    const sharedMetrics =
      friendship.requesterId === userId
        ? friendship.requesterSharedMetrics
        : friendship.receiverSharedMetrics;

    return sharedMetrics;
  }

  private filterHealthDataByMetrics(
    healthData: HealthDataPoint[] | Partial<GetHealthDataResponseDto>[],
    sharedMetrics: HealthMetric[],
  ): Partial<HealthDataPoint>[] {
    return healthData.map((point) => {
      const filteredDataPoint: Partial<HealthDataPoint> = {
        recordTime: point.recordTime,
      };

      for (const metric of sharedMetrics) {
        const properties = this.metricToPropertyMap[metric];
        if (!properties) {
          continue;
        }

        if (Array.isArray(properties)) {
          for (const prop of properties) {
            filteredDataPoint[prop] = point[prop];
          }
        } else {
          filteredDataPoint[properties] = point[properties];
        }
      }

      return filteredDataPoint;
    });
  }

  private async getFriendship(
    userId: string,
    friendId: string,
  ): Promise<UserFriends> {
    const friendship = await this.userFriendsRepository.findOne({
      where: [
        {
          requesterId: userId,
          receiverId: friendId,
          status: FriendshipStatus.ACCEPTED,
        },
        {
          requesterId: friendId,
          receiverId: userId,
          status: FriendshipStatus.ACCEPTED,
        },
      ],
    });

    if (!friendship) {
      throw new ForbiddenException('Users are not friends');
    }

    return friendship;
  }

  private getSharedMetrics(
    friendship: UserFriends,
    userId: string,
  ): HealthMetric[] {
    const sharedMetrics =
      friendship.requesterId === userId
        ? friendship.receiverSharedMetrics
        : friendship.requesterSharedMetrics;

    return sharedMetrics;
  }

  private filterProgressData(
    healthData: HealthDataSet,
    sharedMetrics: HealthMetric[],
  ): {
    currentData: Partial<HealthDataPoint>[];
    previousData: Partial<HealthDataPoint>[];
  } {
    return {
      currentData: healthData.currentData.length
        ? this.filterHealthDataByMetrics(healthData.currentData, sharedMetrics)
        : [],
      previousData: healthData.previousData.length
        ? this.filterHealthDataByMetrics(healthData.previousData, sharedMetrics)
        : [],
    };
  }
}
