import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentTakingService } from './assessment-taking.service';

describe('AssessmentTakingService', () => {
  let service: AssessmentTakingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssessmentTakingService],
    }).compile();

    service = module.get<AssessmentTakingService>(AssessmentTakingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
