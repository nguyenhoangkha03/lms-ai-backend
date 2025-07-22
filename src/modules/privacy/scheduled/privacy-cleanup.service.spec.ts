import { Test, TestingModule } from '@nestjs/testing';
import { PrivacyCleanupService } from './privacy-cleanup.service';

describe('PrivacyCleanupService', () => {
  let service: PrivacyCleanupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrivacyCleanupService],
    }).compile();

    service = module.get<PrivacyCleanupService>(PrivacyCleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
