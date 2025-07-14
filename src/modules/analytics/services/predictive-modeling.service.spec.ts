import { Test, TestingModule } from '@nestjs/testing';
import { PredictiveModelingService } from './predictive-modeling.service';

describe('PredictiveModelingService', () => {
  let service: PredictiveModelingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PredictiveModelingService],
    }).compile();

    service = module.get<PredictiveModelingService>(PredictiveModelingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
