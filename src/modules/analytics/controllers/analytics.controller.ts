import { Controller } from '@nestjs/common';
import { BehaviorAnalyticsService } from '../services/behavior-analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: BehaviorAnalyticsService) {}
}
