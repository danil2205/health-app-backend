import { HealthDataPoint } from 'src/health-data/health-data-point.entity';
import { GetHealthDataResponseDto } from './get-health-data-response.dto';

export type HealthDataSet = {
  currentData: Partial<GetHealthDataResponseDto>[];
  previousData: Partial<GetHealthDataResponseDto>[];
};

export class GetHighlightDataResponseDto {
  typicalData: Record<string, Partial<HealthDataPoint>[]>;
  monthProgressData: HealthDataSet;
  yearProgressData: HealthDataSet;
  avgMetricData: Partial<GetHealthDataResponseDto>[];
}