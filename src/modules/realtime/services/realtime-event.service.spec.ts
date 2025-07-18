import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeEventService } from './realtime-event.service';

describe('RealtimeEventService', () => {
  let service: RealtimeEventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RealtimeEventService],
    }).compile();

    service = module.get<RealtimeEventService>(RealtimeEventService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
