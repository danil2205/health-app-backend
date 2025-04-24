import { Body, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { HealthDataService } from './health-data.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { HealthDataDto } from './dto/health-data.dto';
import { HealthData } from './health-data.entity';

@Controller('health')
export class HealthDataController {
  constructor(private readonly healthDataService: HealthDataService) {}

  // @UseGuards(AuthGuard)
  @Post('save')
  async saveHealthData(
    @Query('watchId') watchId: string,
    @Body() healthData: any,
  ): Promise<HealthData> {
    return this.healthDataService.saveHealthData(watchId, healthData);
  }
}
