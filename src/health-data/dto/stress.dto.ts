import { IsInt, IsNumber, IsPositive } from 'class-validator';

export class StressDto {
	@IsInt()
	@IsPositive()
  value: number;

	@IsNumber()
  time: number;
}