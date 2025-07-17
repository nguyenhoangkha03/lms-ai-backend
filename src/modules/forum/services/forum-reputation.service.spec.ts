import { Test, TestingModule } from '@nestjs/testing';
import { ForumReputationService } from './forum-reputation.service';

describe('ForumReputationService', () => {
  let service: ForumReputationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForumReputationService],
    }).compile();

    service = module.get<ForumReputationService>(ForumReputationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
