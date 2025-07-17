import { Test, TestingModule } from '@nestjs/testing';
import { ForumCategoryService } from './forum-category.service';

describe('ForumCategoryService', () => {
  let service: ForumCategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForumCategoryService],
    }).compile();

    service = module.get<ForumCategoryService>(ForumCategoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
