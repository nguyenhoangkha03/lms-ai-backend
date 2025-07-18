import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDeliveryService } from './notification-delivery.service';

describe('NotificationDeliveryService', () => {
  let service: NotificationDeliveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationDeliveryService],
    }).compile();

    service = module.get<NotificationDeliveryService>(NotificationDeliveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
