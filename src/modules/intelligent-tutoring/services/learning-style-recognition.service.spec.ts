import { Test, TestingModule } from '@nestjs/testing';
import { LearningStyleRecognitionService } from './learning-style-recognition.service';

describe('LearningStyleRecognitionService', () => {
  let service: LearningStyleRecognitionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LearningStyleRecognitionService],
    }).compile();

    service = module.get<LearningStyleRecognitionService>(LearningStyleRecognitionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
