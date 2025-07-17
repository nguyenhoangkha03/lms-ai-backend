import { Test, TestingModule } from '@nestjs/testing';
import { ForumCategoryController } from './forum-category.controller';

describe('ForumCategoryController', () => {
  let controller: ForumCategoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ForumCategoryController],
    }).compile();

    controller = module.get<ForumCategoryController>(ForumCategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
