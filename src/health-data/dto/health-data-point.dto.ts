import { IsArray, IsInt, IsObject, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SleepInfoDto } from './sleep-info.dto';
import { AfibInfoDto } from './atrial-fibrillation.dto';
import { StageInfoDto } from './stage-info.dto';
import { NapInfoDto } from './nap-info.dto';

export class HealthDataPointDto {
  @IsInt()
  heartRate: number;

  @IsInt()
  restHeartRate: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AfibInfoDto)
  afib: Array<AfibInfoDto>;

  @IsInt()
  @Min(0)
  // @Max(255)
  bloodOxygen: number;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageInfoDto)
  sleepStage: Array<StageInfoDto>;

  @IsInt()
  @Min(0)
  @Max(1)
  sleepingStatus: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NapInfoDto)
  sleepNap: Array<NapInfoDto>;

  @IsInt()
  steps: number;

  @IsInt()
  stand: number;

  @IsInt()
  @Min(0)
  @Max(255)
  stress: number;
}