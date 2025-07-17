import { Test, TestingModule } from '@nestjs/testing';
import { ForumSearchController } from './forum-search.controller';

describe('ForumSearchController', () => {
  let controller: ForumSearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ForumSearchController],
    }).compile();

    controller = module.get<ForumSearchController>(ForumSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
