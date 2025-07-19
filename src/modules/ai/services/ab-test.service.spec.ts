import { Test, TestingModule } from '@nestjs/testing';
import { AbTestService } from './ab-test.service';

describe('AbTestService', () => {
  let service: AbTestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AbTestService],
    }).compile();

    service = module.get<AbTestService>(AbTestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
