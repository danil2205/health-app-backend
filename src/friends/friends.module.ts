import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/users.entity';
import { UserFriends } from './user-friends.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserFriends, User]), AuthModule],
  controllers: [FriendsController],
  providers: [FriendsService]
})
export class FriendsModule {}
