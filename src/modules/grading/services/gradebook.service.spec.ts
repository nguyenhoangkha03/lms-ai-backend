import { Test, TestingModule } from '@nestjs/testing';
import { GradebookService } from './gradebook.service';

describe('GradebookService', () => {
  let service: GradebookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GradebookService],
    }).compile();

    service = module.get<GradebookService>(GradebookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
