import { Test, TestingModule } from '@nestjs/testing';
import { DataAnonymizationService } from './data-anonymization.service';

describe('DataAnonymizationService', () => {
  let service: DataAnonymizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataAnonymizationService],
    }).compile();

    service = module.get<DataAnonymizationService>(DataAnonymizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
