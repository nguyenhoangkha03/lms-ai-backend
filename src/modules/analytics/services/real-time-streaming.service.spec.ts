import { Test, TestingModule } from '@nestjs/testing';
import { RealTimeStreamingService } from './real-time-streaming.service';

describe('RealTimeStreamingService', () => {
  let service: RealTimeStreamingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RealTimeStreamingService],
    }).compile();

    service = module.get<RealTimeStreamingService>(RealTimeStreamingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
