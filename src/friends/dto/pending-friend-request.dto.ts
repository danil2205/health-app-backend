type UserSummary = {
  id: string;
  username: string;
  avatar: string;
};

export class PendingFriendRequestDto {
  id: string;
  receiver?: UserSummary;
  requester?: UserSummary;
}
