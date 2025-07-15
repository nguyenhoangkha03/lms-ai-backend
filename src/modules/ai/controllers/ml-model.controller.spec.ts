import { Test, TestingModule } from '@nestjs/testing';
import { MlModelController } from './ml-model.controller';

describe('MlModelController', () => {
  let controller: MlModelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MlModelController],
    }).compile();

    controller = module.get<MlModelController>(MlModelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
