import { Test, TestingModule } from '@nestjs/testing';
import { PredictiveAnalyticsService } from './predictive-analytics.service';

describe('PredictiveAnalyticsService', () => {
  let service: PredictiveAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PredictiveAnalyticsService],
    }).compile();

    service = module.get<PredictiveAnalyticsService>(PredictiveAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
