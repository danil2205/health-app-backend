import { StageInfo } from '../../health-data.entity';

export class GetHealthDataResponseDto {
  recordTime: Date;
  avgHeartRate: number;
  avgRestHeartRate: number;
  // avgAfibVal: number;
  avgBloodOxygen: number;
  totalCalories: number;
  totalDistance: number;
  avgFatBurning: number;
  avgPai: number;
  avgSleepScore: number;
  totalSleepTime: number;
  sleepingStatus: number;
  totalSteps: number;
  totalStand: number;
  avgStress: number;
  sleepStageData: Array<StageInfo>;
}