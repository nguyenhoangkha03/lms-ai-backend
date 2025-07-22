import { Test, TestingModule } from '@nestjs/testing';
import { PrivacySettingsService } from './privacy-settings.service';

describe('PrivacySettingsService', () => {
  let service: PrivacySettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrivacySettingsService],
    }).compile();

    service = module.get<PrivacySettingsService>(PrivacySettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
