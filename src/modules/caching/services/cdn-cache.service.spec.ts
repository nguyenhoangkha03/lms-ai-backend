import { Test, TestingModule } from '@nestjs/testing';
import { CdnCacheService } from './cdn-cache.service';

describe('CdnCacheService', () => {
  let service: CdnCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CdnCacheService],
    }).compile();

    service = module.get<CdnCacheService>(CdnCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
