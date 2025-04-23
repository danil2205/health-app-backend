import { IsOptional, IsString, IsEmail, MaxLength, MinLength } from 'class-validator';
import { ValidateIf } from 'class-validator';

export class UpdateUserDto {
	@IsOptional()
	@IsString()
	@IsEmail()
	email?: string;

	@IsOptional()
	@IsString()
	username?: string;

	@IsOptional()
	@IsString()
	watchId?: string;

	@IsOptional()
	@MinLength(6)
	@MaxLength(20)
	@IsString()
	oldPassword?: string;

	@ValidateIf((o) => (o.oldPassword !== undefined && o.newPassword === undefined) || (o.newPassword !== undefined && o.oldPassword === undefined))
	@IsString()
	@MinLength(6)
	@MaxLength(20)
	newPassword?: string;

	@IsOptional()
	@IsString()
	avatar?: string;	
}
