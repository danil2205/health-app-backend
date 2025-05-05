import {
  IsString,
  IsObject,
  ValidateNested,
  IsInt,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProfileDto } from './profile.dto';
import { HealthDataPointDto } from './health-data-point.dto';

export class HealthDataDto {
  @IsString()
  @MaxLength(20)
  watchName: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ProfileDto)
  profile: ProfileDto;

  @IsInt()
  @Min(0)
  @Max(100)
  battery: number;

  @IsObject()
  @ValidateNested()
  @Type(() => HealthDataPointDto)
  data: HealthDataPointDto;
}
