import { Test, TestingModule } from '@nestjs/testing';
import { ProctoringService } from './proctoring.service';

describe('ProctoringService', () => {
  let service: ProctoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProctoringService],
    }).compile();

    service = module.get<ProctoringService>(ProctoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
