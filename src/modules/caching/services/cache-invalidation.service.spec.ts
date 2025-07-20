import { Test, TestingModule } from '@nestjs/testing';
import { CacheInvalidationService } from './cache-invalidation.service';

describe('CacheInvalidationService', () => {
  let service: CacheInvalidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheInvalidationService],
    }).compile();

    service = module.get<CacheInvalidationService>(CacheInvalidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
