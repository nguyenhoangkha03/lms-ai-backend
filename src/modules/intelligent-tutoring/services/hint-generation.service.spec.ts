import { Test, TestingModule } from '@nestjs/testing';
import { HintGenerationService } from './hint-generation.service';

describe('HintGenerationService', () => {
  let service: HintGenerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HintGenerationService],
    }).compile();

    service = module.get<HintGenerationService>(HintGenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
