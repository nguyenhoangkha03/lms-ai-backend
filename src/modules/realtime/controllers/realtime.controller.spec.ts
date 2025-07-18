import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';

describe('RealtimeController', () => {
  let controller: RealtimeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RealtimeController],
      providers: [RealtimeService],
    }).compile();

    controller = module.get<RealtimeController>(RealtimeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
