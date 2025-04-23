import { Exclude } from 'class-transformer';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  @Exclude()
  id: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  username: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  watchId: string | null;

  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true })
  avatar: string;
}
