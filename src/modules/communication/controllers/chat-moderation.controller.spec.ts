import { Test, TestingModule } from '@nestjs/testing';
import { ChatModerationController } from './chat-moderation.controller';

describe('ChatModerationController', () => {
  let controller: ChatModerationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatModerationController],
    }).compile();

    controller = module.get<ChatModerationController>(ChatModerationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
