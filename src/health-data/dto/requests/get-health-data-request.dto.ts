import { IsEnum } from 'class-validator';
import { TimePeriod } from '../../health-data.service';

export class GetHealthDataRequestDto {
	@IsEnum(TimePeriod)
	period: TimePeriod;
}