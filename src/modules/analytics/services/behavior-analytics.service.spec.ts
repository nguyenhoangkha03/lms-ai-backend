import { Test, TestingModule } from '@nestjs/testing';
import { BehaviorAnalyticsService } from './behavior-analytics.service';

describe('BehaviorAnalyticsService', () => {
  let service: BehaviorAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BehaviorAnalyticsService],
    }).compile();

    service = module.get<BehaviorAnalyticsService>(BehaviorAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
