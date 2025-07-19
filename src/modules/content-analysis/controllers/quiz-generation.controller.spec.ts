import { Test, TestingModule } from '@nestjs/testing';
import { QuizGenerationController } from './quiz-generation.controller';

describe('QuizGenerationController', () => {
  let controller: QuizGenerationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizGenerationController],
    }).compile();

    controller = module.get<QuizGenerationController>(QuizGenerationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
