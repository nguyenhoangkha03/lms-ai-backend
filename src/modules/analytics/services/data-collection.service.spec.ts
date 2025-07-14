import { Test, TestingModule } from '@nestjs/testing';
import { DataCollectionService } from './data-collection.service';

describe('DataCollectionService', () => {
  let service: DataCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataCollectionService],
    }).compile();

    service = module.get<DataCollectionService>(DataCollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
