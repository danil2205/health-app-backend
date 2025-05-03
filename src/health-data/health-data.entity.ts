import { Entity, Column, PrimaryColumn } from 'typeorm';

interface Profile {
  age: number;
  height: number;
  weight: number;
  gender: number;
  nickName: string;
  region: string;
  birth: {
    year: number;
    month: number;
    day: number;
  };
}

interface SleepInfo {
  score: number;
  startTime: number;
  endTime: number;
  deepTime: number; // in minutes
  totalTime: number; // in minutes
}

interface AfibInfo {
  flag: number;
  val: number;
  maxValue: number;
  minValue: number;
  time: number;
  duration: number;
}

interface StageInfo {
  model: number;
  start: number;
  stop: number;
}

interface NapInfo {
  length: number; // in minutes
  start: number;
  stop: number;
}

interface HealthDataPoint {
  recordTime: Date;
  heartRate: number;
  restHeartRate: number;
  afib: AfibInfo[];
  bloodOxygen: number;
  calories: number;
  distance: number;
  fatBurning: number;
  pai: number;
  sleepInfo: SleepInfo;
  sleepStage: StageInfo[];
  sleepingStatus: number;
  sleepNap: NapInfo[];
  steps: number;
  stand: number; // in hours
  stress: number;
}

@Entity('health_data2')
export class HealthData {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column('varchar', { name: 'watch_name' })
  watchName: string;

  @Column('jsonb')
  profile: Profile;

  @Column('integer')
  battery: number;

  @Column('jsonb', { array: false, default: () => "'[]'" })
  data: HealthDataPoint[];
}
