import { Test, TestingModule } from '@nestjs/testing';
import { ForumTagController } from './forum-tag.controller';

describe('ForumTagController', () => {
  let controller: ForumTagController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ForumTagController],
    }).compile();

    controller = module.get<ForumTagController>(ForumTagController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
