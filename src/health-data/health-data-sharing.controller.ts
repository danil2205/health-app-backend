import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { HealthDataSharingService } from './health-data-sharing.service';
import { UpdateHealthSharingDto } from './dto/requests/update-health-sharing.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { HealthDataPoint } from './health-data-point.entity';
import { TimePeriod } from './health-data.service';

@Controller('health/sharing')
export class HealthDataSharingController {
  constructor(
    private readonly healthDataSharingService: HealthDataSharingService,
  ) {}

  @UseGuards(AuthGuard)
  @Post('update')
  async updateSharedMetrics(
    @Request() req,
    @Body() updateDto: UpdateHealthSharingDto,
  ) {
    return this.healthDataSharingService.updateSharedMetrics(
      req.user.id,
      updateDto,
    );
  }

  @UseGuards(AuthGuard)
  @Get('friend/:friendId')
  async getFriendHealthData(
    @Request() req,
    @Param('friendId') friendId: string,
    @Query('timezone') timezone: string = 'UTC',
    @Query('period') period: TimePeriod = TimePeriod.WEEK,
    @Query('offset', ParseIntPipe) offset: number = 0,
  ) {
    return this.healthDataSharingService.getFriendHealthData(
      req.user.id,
      friendId,
      timezone,
      period,
      offset,
    );
  }

  @UseGuards(AuthGuard)
  @Get('friendDaily/:friendId')
  async getFriendDailyHealthData(
    @Request() req,
    @Param('friendId') friendId: string,
    @Query('timezone') timezone: string = 'UTC',
    @Query('offset', ParseIntPipe) offset: number = 0,
  ): Promise<Partial<HealthDataPoint>[]> {
    return this.healthDataSharingService.getFriendDailyHealthData(
      req.user.id,
      friendId,
      offset,
      timezone,
    );
  }

  @UseGuards(AuthGuard)
  @Get('my-shared/:friendId')
  async getMySharedMetricsForFriend(
    @Request() req,
    @Param('friendId') friendId: string,
  ) {
    return this.healthDataSharingService.getMySharedMetricsForFriend(
      req.user.id,
      friendId,
    );
  }
}
