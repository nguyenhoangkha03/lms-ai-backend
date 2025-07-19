import { Test, TestingModule } from '@nestjs/testing';
import { AdaptiveContentService } from './adaptive-content.service';

describe('AdaptiveContentService', () => {
  let service: AdaptiveContentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdaptiveContentService],
    }).compile();

    service = module.get<AdaptiveContentService>(AdaptiveContentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
