import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { HealthDataSharingService } from './health-data-sharing.service';
import { UpdateHealthSharingDto } from './dto/requests/update-health-sharing.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

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
  ) {
    return this.healthDataSharingService.getFriendHealthData(
      req.user.id,
      friendId,
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
