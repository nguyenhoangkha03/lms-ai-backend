import { Test, TestingModule } from '@nestjs/testing';
import { PeerReviewController } from './peer-review.controller';

describe('PeerReviewController', () => {
  let controller: PeerReviewController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PeerReviewController],
    }).compile();

    controller = module.get<PeerReviewController>(PeerReviewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
