import { Test, TestingModule } from '@nestjs/testing';
import { VideoSessionController } from './video-session.controller';

describe('VideoSessionController', () => {
  let controller: VideoSessionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoSessionController],
    }).compile();

    controller = module.get<VideoSessionController>(VideoSessionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
