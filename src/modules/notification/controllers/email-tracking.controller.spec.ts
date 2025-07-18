import { Test, TestingModule } from '@nestjs/testing';
import { EmailTrackingController } from './email-tracking.controller';

describe('EmailTrackingController', () => {
  let controller: EmailTrackingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailTrackingController],
    }).compile();

    controller = module.get<EmailTrackingController>(EmailTrackingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
