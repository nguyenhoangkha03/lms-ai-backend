import { Test, TestingModule } from '@nestjs/testing';
import { ModelServingController } from './model-serving.controller';

describe('ModelServingController', () => {
  let controller: ModelServingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModelServingController],
    }).compile();

    controller = module.get<ModelServingController>(ModelServingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
