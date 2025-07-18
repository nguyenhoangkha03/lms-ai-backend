import { Test, TestingModule } from '@nestjs/testing';
import { NotificationSubscriptionService } from './notification-subscription.service';

describe('NotificationSubscriptionService', () => {
  let service: NotificationSubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationSubscriptionService],
    }).compile();

    service = module.get<NotificationSubscriptionService>(NotificationSubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
