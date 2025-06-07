import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { HealthDataService, TimePeriod } from './health-data.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { HealthDataPoint } from './health-data-point.entity';
import { HealthDataPointDto } from './dto/health-data-point.dto';
import { GetHealthDataResponseDto } from './dto/responses/get-health-data-response.dto';

@Controller('health')
export class HealthDataController {
  constructor(private readonly healthDataService: HealthDataService) {}

  @UseGuards(AuthGuard)
  @Get('daily')
  async getDailyHealthDataPoints(
    @Request() req,
    @Query('timezone') timezone: string,
    @Query('offset', ParseIntPipe) offset: number = 0,
  ): Promise<HealthDataPoint[]> {
    return this.healthDataService.getDailyHealthDataPoints(
      req.user.id,
      timezone,
      offset,
    );
  }

  @UseGuards(AuthGuard)
  @Get()
  async getHealthDataByPeriod(
    @Request() req,
    @Query('timezone') timezone: string,
    @Query('period') period: TimePeriod = TimePeriod.WEEK,
    @Query('offset', ParseIntPipe) offset: number = 0,
  ): Promise<GetHealthDataResponseDto[]> {
    return this.healthDataService.getHealthDataByPeriod(
      req.user.id,
      timezone,
      period,
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
