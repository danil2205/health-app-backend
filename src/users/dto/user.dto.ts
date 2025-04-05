import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class UserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password: string;
}
