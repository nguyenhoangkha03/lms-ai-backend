import { Test, TestingModule } from '@nestjs/testing';
import { NotificationSubscriptionController } from './notification-subscription.controller';

describe('NotificationSubscriptionController', () => {
  let controller: NotificationSubscriptionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationSubscriptionController],
    }).compile();

    controller = module.get<NotificationSubscriptionController>(NotificationSubscriptionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
