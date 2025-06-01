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
import { HealthDataPoint } from './health-data.entity';
import { HealthDataPointDto } from './dto/health-data-point.dto';

@Controller('health')
export class HealthDataController {
  constructor(private readonly healthDataService: HealthDataService) {}

  @UseGuards(AuthGuard)
  @Get()
  async getHealthDataByUserId(
    @Request() req,
    @Query('timezone') timezone: string,
  ): Promise<AllPeriodsHealthData> {
    return this.healthDataService.getHealthDataByUserId(req.user.id, timezone);
  }

  @UseGuards(AuthGuard)
  @Get('daily')
  async getDailyHealthDataPoints(
    @Request() req,
    @Query('timezone') timezone: string,
    @Query('offset') offset: number = 0,
  ): Promise<HealthDataPoint[]> {
    return this.healthDataService.getDailyHealthDataPoints(
      req.user.id,
      timezone,
      offset,
    );
  }

  // @UseGuards(AuthGuard)
  @Post('save')
  async saveHealthData(
    @Query('watchId') watchId: string,
    @Body() healthDataPoint: HealthDataPointDto,
  ): Promise<HealthDataPoint> {
    return this.healthDataService.saveHealthData(watchId, healthDataPoint);
  }
}
