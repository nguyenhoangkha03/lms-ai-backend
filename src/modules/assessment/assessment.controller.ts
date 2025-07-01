import { Controller } from '@nestjs/common';
import { AssessmentService } from './assessment.service';

@Controller('assessment')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}
}
