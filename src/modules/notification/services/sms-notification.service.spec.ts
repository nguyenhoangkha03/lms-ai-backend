import { Test, TestingModule } from '@nestjs/testing';
import { SmsNotificationService } from './sms-notification.service';

describe('SmsNotificationService', () => {
  let service: SmsNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsNotificationService],
    }).compile();

    service = module.get<SmsNotificationService>(SmsNotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
