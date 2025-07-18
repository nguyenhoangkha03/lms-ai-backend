import { Test, TestingModule } from '@nestjs/testing';
import { NotificationAnalyticsService } from './notification-analytics.service';

describe('NotificationAnalyticsService', () => {
  let service: NotificationAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationAnalyticsService],
    }).compile();

    service = module.get<NotificationAnalyticsService>(NotificationAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
