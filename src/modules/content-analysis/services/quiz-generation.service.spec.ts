import { Test, TestingModule } from '@nestjs/testing';
import { QuizGenerationService } from './quiz-generation.service';

describe('QuizGenerationService', () => {
  let service: QuizGenerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuizGenerationService],
    }).compile();

    service = module.get<QuizGenerationService>(QuizGenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
