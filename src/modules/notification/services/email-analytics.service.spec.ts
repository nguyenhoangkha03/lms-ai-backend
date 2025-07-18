import { Test, TestingModule } from '@nestjs/testing';
import { EmailAnalyticsService } from './email-analytics.service';

describe('EmailAnalyticsService', () => {
  let service: EmailAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailAnalyticsService],
    }).compile();

    service = module.get<EmailAnalyticsService>(EmailAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
