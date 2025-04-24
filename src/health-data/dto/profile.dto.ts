import {
  IsInt,
  IsNumber,
  IsObject,
  IsPositive,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { BirthDto } from './birth.dto';
import { Type } from 'class-transformer';

export class ProfileDto {
  @IsInt()
  @IsPositive()
  @Max(99)
  age: number;

  @IsNumber()
  @IsPositive()
  height: number;

  @IsNumber()
  @IsPositive()
  weight: number;

  @IsInt()
  @Min(1)
  @Max(2)
  gender: number;

  @IsString()
  @Length(6, 20)
  nickName: string;

  @IsString()
  @Length(2, 2)
  region: string;

  @IsObject()
  @ValidateNested()
  @Type(() => BirthDto)
  birth: BirthDto;

  @IsNumber()
  @IsPositive()
  menstrual_start: number;

  @IsNumber()
  @IsPositive()
  menstrual_end: number;
}
