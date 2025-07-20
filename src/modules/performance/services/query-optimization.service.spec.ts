import { Test, TestingModule } from '@nestjs/testing';
import { QueryOptimizationService } from './query-optimization.service';

describe('QueryOptimizationService', () => {
  let service: QueryOptimizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryOptimizationService],
    }).compile();

    service = module.get<QueryOptimizationService>(QueryOptimizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
