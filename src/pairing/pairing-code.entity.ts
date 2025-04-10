import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PairingCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string;

  @Column({ default: false })
  isUsed: boolean;

  @Column()
  userId: string;

  @Column({ nullable: true })
  watchId: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
