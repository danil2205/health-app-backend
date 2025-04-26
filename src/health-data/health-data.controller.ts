import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { HealthDataService } from './health-data.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { HealthDataDto } from './dto/health-data.dto';
import { HealthData } from './health-data.entity';
import { GetHealthDataRequestDto } from './dto/requests/get-health-data-request.dto';
import { GetHealthDataResponseDto } from './dto/responses/get-health-data-response.dto';

@Controller('health')
export class HealthDataController {
  constructor(private readonly healthDataService: HealthDataService) {}

  @UseGuards(AuthGuard)
  @Get()
  async getHealthDataByUserId(
    @Request() req,
    @Query() query: GetHealthDataRequestDto,
  ): Promise<GetHealthDataResponseDto[]> {
    return this.healthDataService.getHealthDataByUserId(
      req.user.userId,
      query.period,
    );
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
