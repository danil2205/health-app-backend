import { Exclude } from 'class-transformer';
import { Entity, Column, PrimaryGeneratedColumn, Index, PrimaryColumn } from 'typeorm';

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

export interface StageInfo {
  model: number;
  start: number;
  stop: number;
}

interface NapInfo {
  length: number; // in minutes
  start: number;
  stop: number;
}

@Entity('health_data_points')
@Index(['userId', 'recordTime'])
export class HealthDataPoint {
  @Exclude()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Exclude()
  @Column('uuid', { name: 'user_id' })
  @Index()
  userId: string;

  @PrimaryColumn('timestamp with time zone', { name: 'record_time' })
  @Index()
  recordTime: Date;

  @Column('integer', { name: 'heart_rate' })
  heartRate: number;

  @Column('integer', { name: 'rest_heart_rate' })
  restHeartRate: number;

  @Column('integer', { name: 'blood_oxygen' })
  bloodOxygen: number;

  @Column('integer', { name: 'stress' })
  stress: number;

  @Column('integer', { name: 'calories', default: 0 })
  calories: number;

  @Column('integer', { name: 'distance', default: 0 })
  distance: number;

  @Column('integer', { name: 'steps', default: 0 })
  steps: number;

  @Column('integer', { name: 'stand', default: 0 })
  stand: number;

  @Column('integer', { name: 'fat_burning' })
  fatBurning: number;

  @Column('integer', { name: 'pai' })
  pai: number;

  @Column('jsonb', { name: 'sleep_info' })
  sleepInfo: SleepInfo;

  @Column('jsonb', { name: 'sleep_stage' })
  sleepStage: StageInfo[];

  @Column('integer', { name: 'sleeping_status' })
  sleepingStatus: number;

  @Column('jsonb', { name: 'sleep_nap' })
  sleepNap: NapInfo[];

  @Column('jsonb', { name: 'afib' })
  afib: AfibInfo[];
}