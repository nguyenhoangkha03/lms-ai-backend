import { Test, TestingModule } from '@nestjs/testing';
import { ForumVoteService } from './forum-vote.service';

describe('ForumVoteService', () => {
  let service: ForumVoteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForumVoteService],
    }).compile();

    service = module.get<ForumVoteService>(ForumVoteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
