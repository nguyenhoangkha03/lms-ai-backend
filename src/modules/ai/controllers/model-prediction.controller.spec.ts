import { Test, TestingModule } from '@nestjs/testing';
import { ModelPredictionController } from './model-prediction.controller';

describe('ModelPredictionController', () => {
  let controller: ModelPredictionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModelPredictionController],
    }).compile();

    controller = module.get<ModelPredictionController>(ModelPredictionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
