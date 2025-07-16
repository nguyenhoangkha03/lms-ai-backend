import { Test, TestingModule } from '@nestjs/testing';
import { ChatRoomService } from './chat-room.service';

describe('ChatRoomService', () => {
  let service: ChatRoomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatRoomService],
    }).compile();

    service = module.get<ChatRoomService>(ChatRoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
