import { Test, TestingModule } from '@nestjs/testing';
import { ForumPostService } from './forum-post.service';

describe('ForumPostService', () => {
  let service: ForumPostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForumPostService],
    }).compile();

    service = module.get<ForumPostService>(ForumPostService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
