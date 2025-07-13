import { Test, TestingModule } from '@nestjs/testing';
import { GradebookController } from './gradebook.controller';

describe('GradebookController', () => {
  let controller: GradebookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GradebookController],
    }).compile();

    controller = module.get<GradebookController>(GradebookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
