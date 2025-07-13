import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentRandomizationService } from './assessment-randomization.service';

describe('AssessmentRandomizationService', () => {
  let service: AssessmentRandomizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssessmentRandomizationService],
    }).compile();

    service = module.get<AssessmentRandomizationService>(AssessmentRandomizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
