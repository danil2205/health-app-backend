import { Module } from '@nestjs/common';
import { HealthDataService } from './health-data.service';
import { HealthDataController } from './health-data.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthData } from './health-data.entity';
import { User } from '../users/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HealthData, User])],
  providers: [HealthDataService],
  controllers: [HealthDataController]
})
export class HealthDataModule {}
