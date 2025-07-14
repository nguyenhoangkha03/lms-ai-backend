import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsProcessingService } from './analytics-processing.service';

describe('AnalyticsProcessingService', () => {
  let service: AnalyticsProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsProcessingService],
    }).compile();

    service = module.get<AnalyticsProcessingService>(AnalyticsProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
