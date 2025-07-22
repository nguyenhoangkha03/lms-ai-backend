import { Test, TestingModule } from '@nestjs/testing';
import { DataProtectionRequestService } from './data-protection-request.service';

describe('DataProtectionRequestService', () => {
  let service: DataProtectionRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataProtectionRequestService],
    }).compile();

    service = module.get<DataProtectionRequestService>(DataProtectionRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
