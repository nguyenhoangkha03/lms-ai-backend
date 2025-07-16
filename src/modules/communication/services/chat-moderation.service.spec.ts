import { Test, TestingModule } from '@nestjs/testing';
import { ChatModerationService } from './chat-moderation.service';

describe('ChatModerationService', () => {
  let service: ChatModerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatModerationService],
    }).compile();

    service = module.get<ChatModerationService>(ChatModerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
