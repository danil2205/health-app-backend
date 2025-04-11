import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true, unique: true })
  watchId: string;

  @Column()
  password: string;
}
