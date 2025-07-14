import { Test, TestingModule } from '@nestjs/testing';
import { ComparativeAnalyticsService } from './comparative-analytics.service';

describe('ComparativeAnalyticsService', () => {
  let service: ComparativeAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComparativeAnalyticsService],
    }).compile();

    service = module.get<ComparativeAnalyticsService>(ComparativeAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
