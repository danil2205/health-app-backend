import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FriendshipStatus, UserFriends } from './user-friends.entity';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';
import { PendingFriendRequestDto } from './dto/pending-friend-request.dto';
import { FriendResponseDto } from './dto/friend-response.dto';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(UserFriends)
    private readonly userFriendRepository: Repository<UserFriends>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getFriends(userId: string): Promise<FriendResponseDto[]> {
    const acceptedFriendships = await this.userFriendRepository.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { receiverId: userId, status: FriendshipStatus.ACCEPTED },
      ],
    });

    const friends = await Promise.all(
      acceptedFriendships.map(async (friendship) => {
        const friendId =
          friendship.requesterId === userId
            ? friendship.receiverId
            : friendship.requesterId;
        return await this.userRepository.findOne({ where: { id: friendId } });
      }),
    );

    return friends
      .filter((friend) => friend !== null)
      .map((friend) => ({
        id: friend.id,
        username: friend.username,
        avatar: friend.avatar,
      }));
  }

  async sendFriendRequest(
    userId: string,
    friendName: string,
  ): Promise<{ success: boolean; message: string }> {
    const friend = await this.userRepository.findOne({
      where: { username: friendName },
    });

    if (!friend) {
      throw new NotFoundException('User not found');
    }

    if (friend.id === userId) {
      throw new BadRequestException(
        'You cannot send a friend request to yourself',
      );
    }

    const isFriendRequestExist = await this.userFriendRepository.findOne({
      where: [
        { requesterId: userId, receiverId: friend.id },
        { requesterId: friend.id, receiverId: userId },
      ],
    });

    if (isFriendRequestExist) {
      throw new BadRequestException('Friend request already exists');
    }

    const friendRequest = this.userFriendRepository.create({
      requesterId: userId,
      receiverId: friend.id,
    });

    await this.userFriendRepository.save(friendRequest);
    return { success: true, message: 'Friend request sent successfully' };
  }

  async respondToFriendRequest(
    userId: string,
    respondFriendRequestDto: RespondFriendRequestDto,
  ): Promise<{ success: boolean; message: string }> {
    const friendRequest = await this.userFriendRepository.findOne({
      where: { receiverId: userId, id: respondFriendRequestDto.requestId },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    if (respondFriendRequestDto.isAccepted) {
      friendRequest.status = FriendshipStatus.ACCEPTED;
      await this.userFriendRepository.save(friendRequest);
      return { success: true, message: 'Friend request accepted' };
    } else {
      await this.userFriendRepository.delete(friendRequest.id);
      return { success: true, message: 'Friend request rejected' };
    }
  }

  private async getFriendRequests(
    userId: string,
    isReceiver: boolean,
  ): Promise<PendingFriendRequestDto[]> {
    const whereClause = isReceiver
      ? { receiverId: userId, status: FriendshipStatus.PENDING }
      : { requesterId: userId, status: FriendshipStatus.PENDING };

    const requests = await this.userFriendRepository.find({
      where: whereClause,
    });

    const result = await Promise.all(
      requests.map(async (friendship) => {
        const targetUserId = isReceiver
          ? friendship.requesterId
          : friendship.receiverId;
        const targetUser = await this.userRepository.findOne({
          where: { id: targetUserId },
        });

        if (!targetUser) return null;

        return {
          id: friendship.id,
          [isReceiver ? 'requester' : 'receiver']: {
            id: targetUser.id,
            username: targetUser.username,
            avatar: targetUser.avatar,
          },
        };
      }),
    );

    return result.filter(
      (request) => request !== null,
    );
  }

  async getPendingFriendRequests(
    userId: string,
  ): Promise<PendingFriendRequestDto[]> {
    return this.getFriendRequests(userId, true);
  }

  async getSentFriendRequests(
    userId: string,
  ): Promise<PendingFriendRequestDto[]> {
    return this.getFriendRequests(userId, false);
  }

  async removeFriend(
    userId: string,
    friendId: string,
  ): Promise<{ success: boolean; message: string }> {
    const friendship = await this.userFriendRepository.findOne({
      where: [
        { requesterId: userId, receiverId: friendId },
        { requesterId: friendId, receiverId: userId },
      ],
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.userFriendRepository.delete(friendship.id);
    return { success: true, message: 'Friend removed successfully' };
  }
}
