import { Test, TestingModule } from '@nestjs/testing';
import { EmailSuppressionService } from './email-suppression.service';

describe('EmailSuppressionService', () => {
  let service: EmailSuppressionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailSuppressionService],
    }).compile();

    service = module.get<EmailSuppressionService>(EmailSuppressionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
