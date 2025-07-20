import { Test, TestingModule } from '@nestjs/testing';
import { ResourceOptimizationService } from './resource-optimization.service';

describe('ResourceOptimizationService', () => {
  let service: ResourceOptimizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResourceOptimizationService],
    }).compile();

    service = module.get<ResourceOptimizationService>(ResourceOptimizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
