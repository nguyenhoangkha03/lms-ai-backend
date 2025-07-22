import { Test, TestingModule } from '@nestjs/testing';
import { DataDeletionService } from './data-deletion.service';

describe('DataDeletionService', () => {
  let service: DataDeletionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataDeletionService],
    }).compile();

    service = module.get<DataDeletionService>(DataDeletionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
