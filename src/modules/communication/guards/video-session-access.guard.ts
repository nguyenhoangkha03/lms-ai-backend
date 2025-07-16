import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { VideoSessionService } from '../services/video-session.service';

@Injectable()
export class VideoSessionAccessGuard implements CanActivate {
  constructor(private readonly sessionService: VideoSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.params.sessionId;
    const userId = request.user.id;

    if (!sessionId || !userId) {
      return false;
    }

    try {
      const session = await this.sessionService.getSessionById(sessionId);

      // Check if user is host or participant
      const participants = await this.sessionService.getSessionParticipants(sessionId, true);
      const isParticipant = participants.some(p => p.userId === userId);
      const isHost = session.hostId === userId;

      return isHost || isParticipant;
    } catch (error) {
      return false;
    }
  }
}
