import { Test, TestingModule } from '@nestjs/testing';
import { ModelMonitoringService } from './model-monitoring.service';

describe('ModelMonitoringService', () => {
  let service: ModelMonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModelMonitoringService],
    }).compile();

    service = module.get<ModelMonitoringService>(ModelMonitoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
