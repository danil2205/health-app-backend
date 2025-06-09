import { IsNotEmpty, IsString, IsTimeZone, MaxLength } from 'class-validator';

export class SendPromptDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	query: string;

	@IsString()
	@IsTimeZone()
	@IsNotEmpty()
	timezone: string;
}