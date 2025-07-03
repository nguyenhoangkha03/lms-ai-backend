import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionService } from '../services/session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.cookies?.['session-id'] || request.headers['x-session-id'];

    if (!sessionId) {
      throw new UnauthorizedException('No session found');
    }

    if (await this.sessionService.isSessionBlacklisted(sessionId)) {
      throw new UnauthorizedException('Session is blacklisted');
    }

    const sessionData = await this.sessionService.validateSession(sessionId);

    if (!sessionData) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    request.user = sessionData;
    request.sessionId = sessionId;

    return true;
  }
}
