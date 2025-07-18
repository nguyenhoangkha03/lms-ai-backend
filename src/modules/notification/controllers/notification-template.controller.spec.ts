import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTemplateController } from './notification-template.controller';

describe('NotificationTemplateController', () => {
  let controller: NotificationTemplateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationTemplateController],
    }).compile();

    controller = module.get<NotificationTemplateController>(NotificationTemplateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
