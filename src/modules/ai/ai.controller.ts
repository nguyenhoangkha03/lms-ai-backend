import { Controller } from '@nestjs/common';
import { AiService } from './services/ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}
}
