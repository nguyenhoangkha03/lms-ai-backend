import { Test, TestingModule } from '@nestjs/testing';
import { TutoringController } from './tutoring.controller';

describe('TutoringController', () => {
  let controller: TutoringController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TutoringController],
    }).compile();

    controller = module.get<TutoringController>(TutoringController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
