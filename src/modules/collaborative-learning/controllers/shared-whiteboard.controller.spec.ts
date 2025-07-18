import { Test, TestingModule } from '@nestjs/testing';
import { SharedWhiteboardController } from './shared-whiteboard.controller';

describe('SharedWhiteboardController', () => {
  let controller: SharedWhiteboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SharedWhiteboardController],
    }).compile();

    controller = module.get<SharedWhiteboardController>(SharedWhiteboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
