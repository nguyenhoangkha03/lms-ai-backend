import { Test, TestingModule } from '@nestjs/testing';
import { PerformancePredictionController } from './performance-prediction.controller';

describe('PerformancePredictionController', () => {
  let controller: PerformancePredictionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerformancePredictionController],
    }).compile();

    controller = module.get<PerformancePredictionController>(PerformancePredictionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
