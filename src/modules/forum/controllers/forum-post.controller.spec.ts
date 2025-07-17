import { Test, TestingModule } from '@nestjs/testing';
import { ForumPostController } from './forum-post.controller';

describe('ForumPostController', () => {
  let controller: ForumPostController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ForumPostController],
    }).compile();

    controller = module.get<ForumPostController>(ForumPostController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
