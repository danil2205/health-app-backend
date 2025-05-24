import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

export enum HealthMetric {
  HEART_RATE = 'heartRate',
  REST_HEART_RATE = 'restHeartRate',
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
  AFIB = 'afib',
}

@Entity('health_data_sharing')
export class HealthDataSharing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'owner_id' })
  ownerId: string;

  @Column('uuid', { name: 'friend_id' })
  friendId: string;

  @Column('jsonb', { name: 'shared_metric', default: () => "'[]'" })
  sharedMetric: HealthMetric[];

  @Column({ name: 'is_shared', default: false })
  isShared: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
