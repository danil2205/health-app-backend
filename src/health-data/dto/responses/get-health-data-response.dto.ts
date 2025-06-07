import { SleepInfo, StageInfo } from '../../health-data-point.entity';

export class GetHealthDataResponseDto {
  recordTime: Date;
  heartRate: number;
  restHeartRate: number;
  bloodOxygen: number;
  calories: number;
  distance: number;
  fatBurning: number;
  pai: number;
  sleepScore: number;
  steps: number;
  stand: number;
  stress: number;
  sleepStage: Array<StageInfo>;
  sleepInfo: SleepInfo;
}
