import { Test, TestingModule } from '@nestjs/testing';
import { ForumStatisticsService } from './forum-statistics.service';

describe('ForumStatisticsService', () => {
  let service: ForumStatisticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForumStatisticsService],
    }).compile();

    service = module.get<ForumStatisticsService>(ForumStatisticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
