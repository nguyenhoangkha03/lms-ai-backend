import { Controller } from '@nestjs/common';
import { CommunicationService } from '../services/communication.service';

@Controller('communication')
export class CommunicationController {
  constructor(private readonly _communicationService: CommunicationService) {}
}
