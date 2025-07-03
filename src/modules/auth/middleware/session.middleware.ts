import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/session.service';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly sessionService: SessionService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const sessionId = req.cookies?.['session-id'] || (req.headers['x-session-id'] as string);

    if (sessionId) {
      const sessionData = await this.sessionService.validateSession(sessionId);

      if (sessionData) {
        req['session'] = sessionData;
        req['sessionId'] = sessionId;
      }
    }

    next();
  }
}
