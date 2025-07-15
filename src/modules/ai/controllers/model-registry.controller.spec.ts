import { Test, TestingModule } from '@nestjs/testing';
import { ModelRegistryController } from './model-registry.controller';

describe('ModelRegistryController', () => {
  let controller: ModelRegistryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModelRegistryController],
    }).compile();

    controller = module.get<ModelRegistryController>(ModelRegistryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
