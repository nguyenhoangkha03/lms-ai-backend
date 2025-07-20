import { Test, TestingModule } from '@nestjs/testing';
import { LearningOutcomeForecastService } from './learning-outcome-forecast.service';

describe('LearningOutcomeForecastService', () => {
  let service: LearningOutcomeForecastService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LearningOutcomeForecastService],
    }).compile();

    service = module.get<LearningOutcomeForecastService>(LearningOutcomeForecastService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
