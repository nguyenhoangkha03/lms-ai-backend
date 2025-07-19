import { Test, TestingModule } from '@nestjs/testing';
import { ContentTaggingService } from './content-tagging.service';

describe('ContentTaggingService', () => {
  let service: ContentTaggingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentTaggingService],
    }).compile();

    service = module.get<ContentTaggingService>(ContentTaggingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
