import { Test, TestingModule } from '@nestjs/testing';
import { QuestionAnsweringService } from './question-answering.service';

describe('QuestionAnsweringService', () => {
  let service: QuestionAnsweringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionAnsweringService],
    }).compile();

    service = module.get<QuestionAnsweringService>(QuestionAnsweringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
