import { ForbiddenException, Injectable } from '@nestjs/common';
import { UpdateHealthSharingDto } from './dto/requests/update-health-sharing.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserFriends, FriendshipStatus } from '../friends/user-friends.entity';
import { Repository } from 'typeorm';
import { AllPeriodsHealthData, HealthDataService } from './health-data.service';
import { GetHealthDataResponseDto } from './dto/responses/get-health-data-response.dto';

export enum HealthMetric {
  HEART_RATE = 'heartRate',
  REST_HEART_RATE = 'restHeartRate',
  // AFIB = 'afib',
  BLOOD_OXYGEN = 'bloodOxygen',
  CALORIES = 'calories',
  DISTANCE = 'distance',
  FAT_BURNING = 'fatBurning',
  PAI = 'pai',
  SLEEP_SCORE = 'sleepScore',
  SLEEP_TIME = 'sleepTime',
  STEPS = 'steps',
  STAND = 'stand',
  STRESS = 'stress',
}

@Injectable()
export class HealthDataSharingService {
  private readonly metricToPropertyMap: Record<
    HealthMetric,
    keyof GetHealthDataResponseDto
  > = {
    [HealthMetric.HEART_RATE]: 'avgHeartRate',
    [HealthMetric.REST_HEART_RATE]: 'avgRestHeartRate',
    // [HealthMetric.AFIB]: 'avgAfibVal',
    [HealthMetric.BLOOD_OXYGEN]: 'avgBloodOxygen',
    [HealthMetric.CALORIES]: 'totalCalories',
    [HealthMetric.DISTANCE]: 'totalDistance',
    [HealthMetric.FAT_BURNING]: 'avgFatBurning',
    [HealthMetric.PAI]: 'avgPai',
    [HealthMetric.SLEEP_SCORE]: 'avgSleepScore',
    [HealthMetric.SLEEP_TIME]: 'totalSleepTime',
    [HealthMetric.STEPS]: 'totalSteps',
    [HealthMetric.STAND]: 'totalStand',
    [HealthMetric.STRESS]: 'avgStress',
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

  async getFriendHealthData(
    userId: string,
    friendId: string,
  ): Promise<Partial<AllPeriodsHealthData>> {
    const friendship = await this.getFriendship(userId, friendId);

    const sharedMetrics =
      friendship.requesterId === userId
        ? friendship.receiverSharedMetrics
        : friendship.requesterSharedMetrics;

    if (sharedMetrics.length === 0) return {};

    const healthData =
      await this.healthDataService.getHealthDataByUserId(friendId);

    return this.filterHealthDataByMetrics(healthData, sharedMetrics);
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
    healthData: AllPeriodsHealthData,
    sharedMetrics: HealthMetric[],
  ): Partial<AllPeriodsHealthData> {
    const filteredData: Partial<AllPeriodsHealthData> = {};

    for (const [period, periodData] of Object.entries(healthData)) {
      filteredData[period] = {};

      for (const [date, dataPoints] of Object.entries(periodData)) {
        filteredData[period][date] = dataPoints.map(
          ({ recordTime, ...rest }) => {
            const filteredPoint: any = { recordTime };

            for (const metric of sharedMetrics) {
              const property = this.metricToPropertyMap[metric];
              if (property && rest[property] !== undefined) {
                filteredPoint[property] = rest[property];
              }
            }

            return filteredPoint;
          },
        );
      }
    }

    return filteredData;
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
}
