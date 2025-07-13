import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAssessmentDto } from './create-assessment.dto';

export class UpdateAssessmentDto extends PartialType(
  OmitType(CreateAssessmentDto, ['questions'] as const),
) {}
