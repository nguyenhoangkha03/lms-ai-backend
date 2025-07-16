import { Test, TestingModule } from '@nestjs/testing';
import { VideoAnalyticsService } from './video-analytics.service';

describe('VideoAnalyticsService', () => {
  let service: VideoAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoAnalyticsService],
    }).compile();

    service = module.get<VideoAnalyticsService>(VideoAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
