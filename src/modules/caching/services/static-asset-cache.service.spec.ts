import { Test, TestingModule } from '@nestjs/testing';
import { StaticAssetCacheService } from './static-asset-cache.service';

describe('StaticAssetCacheService', () => {
  let service: StaticAssetCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StaticAssetCacheService],
    }).compile();

    service = module.get<StaticAssetCacheService>(StaticAssetCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
