import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTemplateService } from './notification-template.service';

describe('NotificationTemplateService', () => {
  let service: NotificationTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationTemplateService],
    }).compile();

    service = module.get<NotificationTemplateService>(NotificationTemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
