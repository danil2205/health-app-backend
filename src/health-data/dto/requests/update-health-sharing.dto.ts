import { IsArray, IsEnum, IsUUID } from 'class-validator';
import { HealthMetric } from '../../health-data-sharing.service';

export class UpdateHealthSharingDto {
  @IsUUID()
  friendId: string;

  @IsArray()
  @IsEnum(HealthMetric, { each: true })
  sharedMetrics: HealthMetric[];
}