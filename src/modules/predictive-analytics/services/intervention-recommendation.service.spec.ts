import { Test, TestingModule } from '@nestjs/testing';
import { InterventionRecommendationService } from './intervention-recommendation.service';

describe('InterventionRecommendationService', () => {
  let service: InterventionRecommendationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InterventionRecommendationService],
    }).compile();

    service = module.get<InterventionRecommendationService>(InterventionRecommendationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
