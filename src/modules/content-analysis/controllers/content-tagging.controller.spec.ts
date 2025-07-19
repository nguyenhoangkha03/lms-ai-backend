import { Test, TestingModule } from '@nestjs/testing';
import { ContentTaggingController } from './content-tagging.controller';

describe('ContentTaggingController', () => {
  let controller: ContentTaggingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentTaggingController],
    }).compile();

    controller = module.get<ContentTaggingController>(ContentTaggingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
