import { Test, TestingModule } from '@nestjs/testing';
import { VideoRecordingService } from './video-recording.service';

describe('VideoRecordingService', () => {
  let service: VideoRecordingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoRecordingService],
    }).compile();

    service = module.get<VideoRecordingService>(VideoRecordingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
