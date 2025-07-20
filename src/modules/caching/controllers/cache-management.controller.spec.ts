import { Test, TestingModule } from '@nestjs/testing';
import { CacheManagementController } from './cache-management.controller';

describe('CacheManagementController', () => {
  let controller: CacheManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheManagementController],
    }).compile();

    controller = module.get<CacheManagementController>(CacheManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
