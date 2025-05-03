import { IsEnum, IsNumber } from 'class-validator';

export enum StageConstants {
	WAKE_STAGE = 7,
	REM_STAGE = 8,
	LIGHT_STAGE = 4,
	DEEP_STAGE = 5,
};

export class StageInfoDto {
	@IsNumber()
	@IsEnum(StageConstants)
	model: number;

	@IsNumber()
	start: number;

	@IsNumber()
	stop: number;
}