import { HealthMetric } from '../health-data/health-data-sharing.service';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
  REJECTED = 'rejected',
}

@Entity('user_friends')
export class UserFriends {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'requester_id' })
  requesterId: string;

  @Column('uuid', { name: 'receiver_id' })
  receiverId: string;

  @Column({
    type: 'enum',
    enum: FriendshipStatus,
    default: FriendshipStatus.PENDING,
  })
  status: FriendshipStatus;

  @Column('jsonb', { name: 'requester_shared_metrics', default: () => "'[]'" })
  requesterSharedMetrics: HealthMetric[];

  @Column('jsonb', { name: 'receiver_shared_metrics', default: () => "'[]'" })
  receiverSharedMetrics: HealthMetric[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
