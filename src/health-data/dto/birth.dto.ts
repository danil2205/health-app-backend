import { IsInt, Max, Min } from 'class-validator';

export class BirthDto {
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(1)
  @Max(31)
  day: number;
}