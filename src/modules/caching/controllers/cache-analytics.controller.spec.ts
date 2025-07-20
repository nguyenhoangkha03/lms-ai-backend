import { Test, TestingModule } from '@nestjs/testing';
import { CacheAnalyticsController } from './cache-analytics.controller';

describe('CacheAnalyticsController', () => {
  let controller: CacheAnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheAnalyticsController],
    }).compile();

    controller = module.get<CacheAnalyticsController>(CacheAnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
