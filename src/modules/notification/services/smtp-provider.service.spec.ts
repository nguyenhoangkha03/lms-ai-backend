import { Test, TestingModule } from '@nestjs/testing';
import { SmtpProviderService } from './smtp-provider.service';

describe('SmtpProviderService', () => {
  let service: SmtpProviderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmtpProviderService],
    }).compile();

    service = module.get<SmtpProviderService>(SmtpProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
