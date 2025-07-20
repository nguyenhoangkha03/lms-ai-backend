import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceMonitoringService } from './performance-monitoring.service';

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceMonitoringService],
    }).compile();

    service = module.get<PerformanceMonitoringService>(PerformanceMonitoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
