import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class AfibInfoDto {
  @IsInt()
  @Min(0)
  @Max(3)
  flag: number;

  @IsInt()
  @Min(0)
  @Max(255)
  val: number;

  @IsInt()
  @Min(0)
  @Max(255)
  maxValue: number;

  @IsInt()
  @Min(0)
  @Max(255)
  minValue: number;

	@IsNumber()
  time: number;

	@IsNumber()
  duration: number;
}
