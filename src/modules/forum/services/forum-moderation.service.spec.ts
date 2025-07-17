import { Test, TestingModule } from '@nestjs/testing';
import { ForumModerationService } from './forum-moderation.service';

describe('ForumModerationService', () => {
  let service: ForumModerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForumModerationService],
    }).compile();

    service = module.get<ForumModerationService>(ForumModerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
