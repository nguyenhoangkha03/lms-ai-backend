import { Test, TestingModule } from '@nestjs/testing';
import { LearningOutcomeForecastController } from './learning-outcome-forecast.controller';

describe('LearningOutcomeForecastController', () => {
  let controller: LearningOutcomeForecastController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearningOutcomeForecastController],
    }).compile();

    controller = module.get<LearningOutcomeForecastController>(LearningOutcomeForecastController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
