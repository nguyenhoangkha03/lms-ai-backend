import { Test, TestingModule } from '@nestjs/testing';
import { ModelMonitoringCronService } from './model-monitoring-cron.service';

describe('ModelMonitoringCronService', () => {
  let service: ModelMonitoringCronService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModelMonitoringCronService],
    }).compile();

    service = module.get<ModelMonitoringCronService>(ModelMonitoringCronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
