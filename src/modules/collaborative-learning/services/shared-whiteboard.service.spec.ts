import { Test, TestingModule } from '@nestjs/testing';
import { SharedWhiteboardService } from './shared-whiteboard.service';

describe('SharedWhiteboardService', () => {
  let service: SharedWhiteboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharedWhiteboardService],
    }).compile();

    service = module.get<SharedWhiteboardService>(SharedWhiteboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
