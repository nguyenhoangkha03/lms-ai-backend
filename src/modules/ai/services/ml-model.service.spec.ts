import { Test, TestingModule } from '@nestjs/testing';
import { MlModelService } from './ml-model.service';

describe('MlModelService', () => {
  let service: MlModelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MlModelService],
    }).compile();

    service = module.get<MlModelService>(MlModelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
