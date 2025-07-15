import { Test, TestingModule } from '@nestjs/testing';
import { CollaborativeFilteringService } from './collaborative-filtering.service';

describe('CollaborativeFilteringService', () => {
  let service: CollaborativeFilteringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CollaborativeFilteringService],
    }).compile();

    service = module.get<CollaborativeFilteringService>(CollaborativeFilteringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
