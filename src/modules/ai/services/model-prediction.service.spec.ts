import { Test, TestingModule } from '@nestjs/testing';
import { ModelPredictionService } from './model-prediction.service';

describe('ModelPredictionService', () => {
  let service: ModelPredictionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModelPredictionService],
    }).compile();

    service = module.get<ModelPredictionService>(ModelPredictionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
