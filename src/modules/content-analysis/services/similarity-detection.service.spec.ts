import { Test, TestingModule } from '@nestjs/testing';
import { SimilarityDetectionService } from './similarity-detection.service';

describe('SimilarityDetectionService', () => {
  let service: SimilarityDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SimilarityDetectionService],
    }).compile();

    service = module.get<SimilarityDetectionService>(SimilarityDetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
