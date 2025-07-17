import { Test, TestingModule } from '@nestjs/testing';
import { ForumTagService } from './forum-tag.service';

describe('ForumTagService', () => {
  let service: ForumTagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForumTagService],
    }).compile();

    service = module.get<ForumTagService>(ForumTagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
