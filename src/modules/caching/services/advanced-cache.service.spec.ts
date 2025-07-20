import { Test, TestingModule } from '@nestjs/testing';
import { AdvancedCacheService } from './advanced-cache.service';

describe('AdvancedCacheService', () => {
  let service: AdvancedCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdvancedCacheService],
    }).compile();

    service = module.get<AdvancedCacheService>(AdvancedCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
