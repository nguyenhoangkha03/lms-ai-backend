import { Test, TestingModule } from '@nestjs/testing';
import { AiEssayGradingService } from './ai-essay-grading.service';

describe('AiEssayGradingService', () => {
  let service: AiEssayGradingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiEssayGradingService],
    }).compile();

    service = module.get<AiEssayGradingService>(AiEssayGradingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
