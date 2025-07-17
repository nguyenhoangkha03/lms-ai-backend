import { Test, TestingModule } from '@nestjs/testing';
import { ForumStatisticsController } from './forum-statistics.controller';

describe('ForumStatisticsController', () => {
  let controller: ForumStatisticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ForumStatisticsController],
    }).compile();

    controller = module.get<ForumStatisticsController>(ForumStatisticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
