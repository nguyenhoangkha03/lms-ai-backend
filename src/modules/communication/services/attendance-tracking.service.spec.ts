import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceTrackingService } from './attendance-tracking.service';

describe('AttendanceTrackingService', () => {
  let service: AttendanceTrackingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttendanceTrackingService],
    }).compile();

    service = module.get<AttendanceTrackingService>(AttendanceTrackingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
