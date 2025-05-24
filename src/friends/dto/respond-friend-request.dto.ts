import { IsBoolean, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class RespondFriendRequestDto {
  @IsUUID()
  requestId: string;

  @IsBoolean()
  @IsNotEmpty()
  isAccepted: boolean;
}
