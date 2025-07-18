import { Test, TestingModule } from '@nestjs/testing';
import { EmailCampaignController } from './email-campaign.controller';

describe('EmailCampaignController', () => {
  let controller: EmailCampaignController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailCampaignController],
    }).compile();

    controller = module.get<EmailCampaignController>(EmailCampaignController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
