import { Test, TestingModule } from '@nestjs/testing';
import { InputValidationService } from './input-validation.service';

describe('InputValidationService', () => {
  let service: InputValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InputValidationService],
    }).compile();

    service = module.get<InputValidationService>(InputValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
