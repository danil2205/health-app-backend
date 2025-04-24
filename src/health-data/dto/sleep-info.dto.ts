import { IsInt } from 'class-validator';

export class SleepInfoDto {
  @IsInt()
  score: number;

  @IsInt()
  startTime: number;

  @IsInt()
  endTime: number;

  @IsInt()
  deepTime: number;

  @IsInt()
  totalTime: number;
}