import { SetMetadata } from '@nestjs/common';

export const REQUIRE_MANUAL_GRADING = 'requireManualGrading';
export const RequireManualGrading = () => SetMetadata(REQUIRE_MANUAL_GRADING, true);

export const GRADING_PERMISSION = 'gradingPermission';
export const GradingPermission = (permission: string) =>
  SetMetadata(GRADING_PERMISSION, permission);

export const AI_GRADING_ENABLED = 'aiGradingEnabled';
export const AiGradingEnabled = () => SetMetadata(AI_GRADING_ENABLED, true);
