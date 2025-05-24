import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AllPeriodsHealthData, HealthDataService } from './health-data.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { HealthDataDto } from './dto/health-data.dto';
import { HealthData } from './entity/health-data.entity';

@Controller('health')
export class HealthDataController {
  constructor(private readonly healthDataService: HealthDataService) {}

  @UseGuards(AuthGuard)
  @Get()
  async getHealthDataByUserId(@Request() req): Promise<AllPeriodsHealthData> {
    return this.healthDataService.getHealthDataByUserId(req.user.id);
  }

  // @UseGuards(AuthGuard)
  @Post('save')
  async saveHealthData(
    @Query('watchId') watchId: string,
    @Body() healthData: HealthDataDto,
  ): Promise<HealthData> {
    return this.healthDataService.saveHealthData(watchId, healthData);
  }
}
