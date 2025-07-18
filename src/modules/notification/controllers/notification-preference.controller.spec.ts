import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferenceController } from './notification-preference.controller';

describe('NotificationPreferenceController', () => {
  let controller: NotificationPreferenceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationPreferenceController],
    }).compile();

    controller = module.get<NotificationPreferenceController>(NotificationPreferenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
