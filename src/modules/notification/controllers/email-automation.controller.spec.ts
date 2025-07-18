import { Test, TestingModule } from '@nestjs/testing';
import { EmailAutomationController } from './email-automation.controller';

describe('EmailAutomationController', () => {
  let controller: EmailAutomationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailAutomationController],
    }).compile();

    controller = module.get<EmailAutomationController>(EmailAutomationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
