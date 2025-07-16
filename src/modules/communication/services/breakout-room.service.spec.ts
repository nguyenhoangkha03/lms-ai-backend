import { Test, TestingModule } from '@nestjs/testing';
import { BreakoutRoomService } from './breakout-room.service';

describe('BreakoutRoomService', () => {
  let service: BreakoutRoomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BreakoutRoomService],
    }).compile();

    service = module.get<BreakoutRoomService>(BreakoutRoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
