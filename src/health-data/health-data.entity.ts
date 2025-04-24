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
  menstrual_start: number;
  menstrual_end: number;
}

interface BloodOxygen {
  value: number;
  time: number;
  retCode: number;
}

interface SleepInfo {
  score: number;
  startTime: number;
  endTime: number;
  deepTime: number;
  totalTime: number;
}

interface Stress {
  value: number;
  time: number;
}

@Entity('health_data')
export class HealthData {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column('varchar', { name: 'watch_name' })
  watchName: string;

  @PrimaryColumn('timestamptz', { default: () => 'NOW()', name: 'record_time' })
  recordTime: Date;

  @Column('jsonb')
  profile: Profile;

  @Column('integer')
  battery: number;

  @Column('integer', { name: 'heart_rate' })
  heartRate: number;

  @Column('jsonb', { name: 'blood_oxygen' })
  bloodOxygen: BloodOxygen;

  @Column('integer')
  calories: number;

  @Column('integer')
  distance: number;

  @Column('integer', { name: 'fat_burning' })
  fatBurning: number;

  @Column('integer')
  pai: number;

  @Column('jsonb', { name: 'sleep_info' })
  sleepInfo: SleepInfo;

  @Column('integer', { name: 'sleeping_status' })
  sleepingStatus: number;

  @Column('integer')
  steps: number;

  @Column('jsonb')
  stress: Stress;

  @Column('integer', { name: 'wear_status' })
  wearStatus: number;
}
