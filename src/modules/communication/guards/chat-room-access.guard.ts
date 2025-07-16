import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ChatRoomService } from '../services/chat-room.service';

@Injectable()
export class ChatRoomAccessGuard implements CanActivate {
  constructor(private readonly roomService: ChatRoomService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const roomId = request.params.roomId || request.body.roomId;
    const userId = request.user.id;

    if (!roomId || !userId) {
      return false;
    }

    return this.roomService.checkUserAccess(roomId, userId);
  }
}
