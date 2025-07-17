import { Test, TestingModule } from '@nestjs/testing';
import { ForumSearchService } from './forum-search.service';

describe('ForumSearchService', () => {
  let service: ForumSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForumSearchService],
    }).compile();

    service = module.get<ForumSearchService>(ForumSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
