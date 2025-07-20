import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseCacheService } from './database-cache.service';

describe('DatabaseCacheService', () => {
  let service: DatabaseCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseCacheService],
    }).compile();

    service = module.get<DatabaseCacheService>(DatabaseCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
