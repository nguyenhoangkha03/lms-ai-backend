import { Test, TestingModule } from '@nestjs/testing';
import { ForumThreadController } from './forum-thread.controller';

describe('ForumThreadController', () => {
  let controller: ForumThreadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ForumThreadController],
    }).compile();

    controller = module.get<ForumThreadController>(ForumThreadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
