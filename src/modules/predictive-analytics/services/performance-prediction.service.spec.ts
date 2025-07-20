import { Test, TestingModule } from '@nestjs/testing';
import { PerformancePredictionService } from './performance-prediction.service';

describe('PerformancePredictionService', () => {
  let service: PerformancePredictionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformancePredictionService],
    }).compile();

    service = module.get<PerformancePredictionService>(PerformancePredictionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
