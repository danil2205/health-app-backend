import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyCodeRequestDto {
	@IsString()
	@Length(5, 5)
	code: string;

	@IsNotEmpty()
	@IsString()
	watchId: string;
}