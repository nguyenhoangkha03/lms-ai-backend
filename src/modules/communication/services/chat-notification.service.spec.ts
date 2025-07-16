import { Test, TestingModule } from '@nestjs/testing';
import { ChatNotificationService } from './chat-notification.service';

describe('ChatNotificationService', () => {
  let service: ChatNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatNotificationService],
    }).compile();

    service = module.get<ChatNotificationService>(ChatNotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
