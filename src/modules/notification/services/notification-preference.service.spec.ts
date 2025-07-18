import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferenceService } from './notification-preference.service';

describe('NotificationPreferenceService', () => {
  let service: NotificationPreferenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationPreferenceService],
    }).compile();

    service = module.get<NotificationPreferenceService>(NotificationPreferenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
