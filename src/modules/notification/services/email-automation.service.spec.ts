import { Test, TestingModule } from '@nestjs/testing';
import { EmailAutomationService } from './email-automation.service';

describe('EmailAutomationService', () => {
  let service: EmailAutomationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailAutomationService],
    }).compile();

    service = module.get<EmailAutomationService>(EmailAutomationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
