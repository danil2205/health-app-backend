import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CheckLinkRequestDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @Length(17, 17)
  watchId?: string;
}
