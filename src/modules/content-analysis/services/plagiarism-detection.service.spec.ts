import { Test, TestingModule } from '@nestjs/testing';
import { PlagiarismDetectionService } from './plagiarism-detection.service';

describe('PlagiarismDetectionService', () => {
  let service: PlagiarismDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlagiarismDetectionService],
    }).compile();

    service = module.get<PlagiarismDetectionService>(PlagiarismDetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
