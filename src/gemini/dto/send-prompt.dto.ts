import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendPromptDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	prompt: string;
}