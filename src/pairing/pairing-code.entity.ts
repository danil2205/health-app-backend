import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PairingCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'phone_code' })
  phoneCode: string;

  @Column({ name: 'is_used', default: false })
  isUsed: boolean;

  @Column({ name: 'is_matched', default: false })
  isMatched: boolean;

  @Column({ name: 'watch_code' })
  watchCode: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'watch_id', nullable: true })
  watchId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({
    name: 'expires_at',
    type: 'timestamptz',
    default: () => "NOW() + INTERVAL '5 MINUTES'",
  })
  expiresAt: Date;
}
