import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class BloodOxygenDto {
	@IsInt()
	@Max(100)
  value: number;

	@IsNumber()
  time: number;

	@IsInt()
	@Min(0)
	@Max(10)
  retCode: number;
}