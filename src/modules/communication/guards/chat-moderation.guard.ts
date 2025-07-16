import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ChatModerationService } from '../services/chat-moderation.service';

@Injectable()
export class ChatModerationGuard implements CanActivate {
  constructor(private readonly moderationService: ChatModerationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const roomId = request.params.roomId || request.body.roomId;
    const userId = request.user.id;

    if (!roomId || !userId) {
      return false;
    }

    // Check if user is banned or muted
    const isBanned = await this.moderationService.isUserBanned(roomId, userId);
    const isMuted = await this.moderationService.isUserMuted(roomId, userId);

    return !isBanned && !isMuted;
  }
}
