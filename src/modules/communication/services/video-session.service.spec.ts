import { Test, TestingModule } from '@nestjs/testing';
import { VideoSessionService } from './video-session.service';

describe('VideoSessionService', () => {
  let service: VideoSessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoSessionService],
    }).compile();

    service = module.get<VideoSessionService>(VideoSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
