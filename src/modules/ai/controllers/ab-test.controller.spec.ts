import { Test, TestingModule } from '@nestjs/testing';
import { AbTestController } from './ab-test.controller';

describe('AbTestController', () => {
  let controller: AbTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AbTestController],
    }).compile();

    controller = module.get<AbTestController>(AbTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
