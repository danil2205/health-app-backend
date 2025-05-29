import { HealthMetric } from 'src/health-data/health-data-sharing.service';

export class FriendResponseDto {
	id: string;
	username: string;
	avatar: string;
	sharedMetrics: HealthMetric[]
}