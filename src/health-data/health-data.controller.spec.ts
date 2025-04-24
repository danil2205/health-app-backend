import { Test, TestingModule } from '@nestjs/testing';
import { HealthDataController } from './health-data.controller';

describe('HealthDataController', () => {
  let controller: HealthDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthDataController],
    }).compile();

    controller = module.get<HealthDataController>(HealthDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
