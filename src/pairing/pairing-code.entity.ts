import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PairingCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string;

  @Column()
  userId: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
