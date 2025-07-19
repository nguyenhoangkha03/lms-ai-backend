import { Test, TestingModule } from '@nestjs/testing';
import { PersonalizedLearningPathService } from './personalized-learning-path.service';

describe('PersonalizedLearningPathService', () => {
  let service: PersonalizedLearningPathService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PersonalizedLearningPathService],
    }).compile();

    service = module.get<PersonalizedLearningPathService>(PersonalizedLearningPathService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
