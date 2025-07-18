import { Test, TestingModule } from '@nestjs/testing';
import { EmailCampaignService } from './email-campaign.service';

describe('EmailCampaignService', () => {
  let service: EmailCampaignService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailCampaignService],
    }).compile();

    service = module.get<EmailCampaignService>(EmailCampaignService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
