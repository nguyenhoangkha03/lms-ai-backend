import { Test, TestingModule } from '@nestjs/testing';
import { InterventionRecommendationController } from './intervention-recommendation.controller';

describe('InterventionRecommendationController', () => {
  let controller: InterventionRecommendationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterventionRecommendationController],
    }).compile();

    controller = module.get<InterventionRecommendationController>(
      InterventionRecommendationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
