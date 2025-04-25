import {
  IsInt,
  IsNumber,
  IsObject,
  IsPositive,
  IsString,
  Length,
  Max,
  MaxLength,
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
  @Min(0)
  @Max(2)
  gender: number;

  @IsString()
  @MaxLength(20)
  nickName: string;

  @IsString()
  @Length(2, 7)
  region: string;

  @IsObject()
  @ValidateNested()
  @Type(() => BirthDto)
  birth: BirthDto;
}
