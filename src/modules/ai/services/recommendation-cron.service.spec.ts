import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationCronService } from './recommendation-cron.service';

describe('RecommendationCronService', () => {
  let service: RecommendationCronService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecommendationCronService],
    }).compile();

    service = module.get<RecommendationCronService>(RecommendationCronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
