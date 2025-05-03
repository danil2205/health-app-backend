import { IsInt } from 'class-validator';

export class NapInfoDto {
	@IsInt()
  length: number;

	@IsInt()
  start: number;

	@IsInt()
  stop: number;
}