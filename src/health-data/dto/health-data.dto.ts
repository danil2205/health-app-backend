import {
  IsUUID,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
	Length,
	IsDate,
	IsObject,
	ValidateNested,
	IsInt,
	Max,
	Min,
} from 'class-validator';
import { ProfileDto } from './profile.dto';
import { Type } from 'class-transformer';
import { BloodOxygenDto } from './blood-oxygen.dto';
import { SleepInfoDto } from './sleep-info.dto';
import { StressDto } from './stress.dto';

export class HealthDataDto {
  @IsString()
  @Length(10, 50)
  watchName: string;

  @IsDate()
  @IsOptional()
  recordTime?: Date;

  @IsObject()
  @ValidateNested()
  @Type(() => ProfileDto)
  profile: ProfileDto;

  @IsInt()
  @Min(0)
  @Max(100)
  battery: number;

  @IsInt()
  heartRate: number;

  @IsObject()
  @ValidateNested()
  @Type(() => BloodOxygenDto)
  bloodOxygen: BloodOxygenDto;

  @IsInt()
  calories: number;

  @IsInt()
  distance: number;

  @IsInt()
  fatBurning: number;

  @IsInt()
  pai: number;

  @IsObject()
  @ValidateNested()
  @Type(() => SleepInfoDto)
  sleepInfo: SleepInfoDto;

  @IsInt()
  @Min(0)
  @Max(1)
  sleepingStatus: number;

  @IsInt()
  steps: number;

  @IsObject()
  @ValidateNested()
  @Type(() => StressDto)
  stress: StressDto;

  @IsInt()
	@Min(0)
	@Max(3)
  wearStatus: number;
}
