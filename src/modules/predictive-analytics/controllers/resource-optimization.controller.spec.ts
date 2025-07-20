import { Test, TestingModule } from '@nestjs/testing';
import { ResourceOptimizationController } from './resource-optimization.controller';

describe('ResourceOptimizationController', () => {
  let controller: ResourceOptimizationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourceOptimizationController],
    }).compile();

    controller = module.get<ResourceOptimizationController>(ResourceOptimizationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
