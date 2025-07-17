import { Test, TestingModule } from '@nestjs/testing';
import { ForumModerationController } from './forum-moderation.controller';

describe('ForumModerationController', () => {
  let controller: ForumModerationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ForumModerationController],
    }).compile();

    controller = module.get<ForumModerationController>(ForumModerationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
