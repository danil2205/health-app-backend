import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @UseGuards(AuthGuard)
  @Get()
  async getFriends(@Request() req) {
    return this.friendsService.getFriends(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Post('request')
  async sendFriendRequest(
    @Request() req,
    @Body() { friendName }: SendFriendRequestDto,
  ) {
    return this.friendsService.sendFriendRequest(req.user.id, friendName);
  }

  @UseGuards(AuthGuard)
  @Post('respond')
  async respondToFriendRequest(
    @Request() req,
    @Body() respondFriendRequest: RespondFriendRequestDto,
  ) {
    return this.friendsService.respondToFriendRequest(
      req.user.id,
      respondFriendRequest,
    );
  }

  @UseGuards(AuthGuard)
  @Get('pending')
  async getPendingFriendRequests(@Request() req) {
    return this.friendsService.getPendingFriendRequests(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Delete(':friendId')
  async deleteFriend(@Request() req, @Param('friendId') friendId: string) {
    return this.friendsService.removeFriend(req.user.id, friendId);
  }
}
