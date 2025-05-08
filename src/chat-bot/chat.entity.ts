import { Column, Entity, PrimaryColumn } from 'typeorm';

export interface History {
	query: string;
	response: string;
	createdAt: string;
}

@Entity('chat')
export class Chat {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

	@Column('jsonb', { array: false, default: () => "'[]'" })
	history: History[];
}