import { Module } from '@nestjs/common';
import { HealthDataService } from './health-data.service';
import { HealthDataController } from './health-data.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthData } from './health-data.entity';
import { User } from '../users/users.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([HealthData, User]), AuthModule],
  providers: [HealthDataService],
  controllers: [HealthDataController],
})
export class HealthDataModule {}
