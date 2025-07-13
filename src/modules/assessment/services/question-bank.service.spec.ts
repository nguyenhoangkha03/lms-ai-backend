import { Test, TestingModule } from '@nestjs/testing';
import { QuestionBankService } from './question-bank.service';

describe('QuestionBankService', () => {
  let service: QuestionBankService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionBankService],
    }).compile();

    service = module.get<QuestionBankService>(QuestionBankService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
