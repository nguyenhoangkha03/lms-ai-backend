import { Test, TestingModule } from '@nestjs/testing';
import { DifficultyAdjustmentService } from './difficulty-adjustment.service';

describe('DifficultyAdjustmentService', () => {
  let service: DifficultyAdjustmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DifficultyAdjustmentService],
    }).compile();

    service = module.get<DifficultyAdjustmentService>(DifficultyAdjustmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
