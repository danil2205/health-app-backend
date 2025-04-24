import { Test, TestingModule } from '@nestjs/testing';
import { HealthDataService } from './health-data.service';

describe('HealthDataService', () => {
  let service: HealthDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthDataService],
    }).compile();

    service = module.get<HealthDataService>(HealthDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
