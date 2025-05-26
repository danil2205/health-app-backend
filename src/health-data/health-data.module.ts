import { Module } from '@nestjs/common';
import { HealthDataService } from './health-data.service';
import { HealthDataController } from './health-data.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthDataPoint, UserDevice } from './entity/health-data.entity';
import { User } from '../users/users.entity';
import { AuthModule } from '../auth/auth.module';
import { UserFriends } from '../friends/user-friends.entity';
import { HealthDataSharingService } from './health-data-sharing.service';
import { HealthDataSharingController } from './health-data-sharing.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthDataPoint, UserDevice, User, UserFriends]),
    AuthModule,
  ],
  exports: [HealthDataService, HealthDataSharingService],
  providers: [HealthDataService, HealthDataSharingService],
  controllers: [HealthDataController, HealthDataSharingController],
})
export class HealthDataModule {}
