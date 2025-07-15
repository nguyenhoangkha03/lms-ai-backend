import { Test, TestingModule } from '@nestjs/testing';
import { PythonAiServiceService } from './python-ai-service.service';

describe('PythonAiServiceService', () => {
  let service: PythonAiServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PythonAiServiceService],
    }).compile();

    service = module.get<PythonAiServiceService>(PythonAiServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
