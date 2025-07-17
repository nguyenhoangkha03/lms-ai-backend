import { Test, TestingModule } from '@nestjs/testing';
import { ForumVoteController } from './forum-vote.controller';

describe('ForumVoteController', () => {
  let controller: ForumVoteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ForumVoteController],
    }).compile();

    controller = module.get<ForumVoteController>(ForumVoteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
