import { Test, TestingModule } from '@nestjs/testing';
import { DataExportService } from './data-export.service';

describe('DataExportService', () => {
  let service: DataExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataExportService],
    }).compile();

    service = module.get<DataExportService>(DataExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
