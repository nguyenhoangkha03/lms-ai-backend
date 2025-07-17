import { Test, TestingModule } from '@nestjs/testing';
import { ForumThreadService } from './forum-thread.service';

describe('ForumThreadService', () => {
  let service: ForumThreadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForumThreadService],
    }).compile();

    service = module.get<ForumThreadService>(ForumThreadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
