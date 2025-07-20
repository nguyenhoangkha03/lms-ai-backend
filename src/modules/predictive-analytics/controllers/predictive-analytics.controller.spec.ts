import { Test, TestingModule } from '@nestjs/testing';
import { PredictiveAnalyticsController } from './predictive-analytics.controller';

describe('PredictiveAnalyticsController', () => {
  let controller: PredictiveAnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PredictiveAnalyticsController],
    }).compile();

    controller = module.get<PredictiveAnalyticsController>(PredictiveAnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
