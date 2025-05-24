import { IsArray, IsUUID } from 'class-validator';
import { HealthMetric } from '../../entity/health-data-sharing.entity';

export class UpdateHealthSharingDto {
	@IsUUID()
	friendId: string;

	@IsArray()
	sharedMetric: HealthMetric[];
}