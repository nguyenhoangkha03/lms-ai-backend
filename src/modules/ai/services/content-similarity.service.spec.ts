import { Test, TestingModule } from '@nestjs/testing';
import { ContentSimilarityService } from './content-similarity.service';

describe('ContentSimilarityService', () => {
  let service: ContentSimilarityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentSimilarityService],
    }).compile();

    service = module.get<ContentSimilarityService>(ContentSimilarityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
