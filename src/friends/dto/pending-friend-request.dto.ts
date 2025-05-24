export class PendingFriendRequestDto {
  id: string;
  receiver: {
    id: string;
    username: string;
    avatar: string;
  };
}
