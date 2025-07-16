import { Test, TestingModule } from '@nestjs/testing';
import { ChatRoomController } from './chat-room.controller';

describe('ChatRoomController', () => {
  let controller: ChatRoomController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatRoomController],
    }).compile();

    controller = module.get<ChatRoomController>(ChatRoomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
