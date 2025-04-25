import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PairingCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  phoneCode: string;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ default: false })
  isMatched: boolean;

  @Column()
  watchCode: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  watchId: string;

  @Column({
    type: 'timestamptz',
    default: () => "NOW() + INTERVAL '5 MINUTES'",
  })
  expiresAt: Date;
}
