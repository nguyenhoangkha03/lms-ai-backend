import { Test, TestingModule } from '@nestjs/testing';
import { PrivacySettingsController } from './privacy-settings.controller';

describe('PrivacySettingsController', () => {
  let controller: PrivacySettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrivacySettingsController],
    }).compile();

    controller = module.get<PrivacySettingsController>(PrivacySettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
