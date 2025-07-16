import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client = context.switchToWs().getClient();
      const token =
        client.handshake?.auth?.token || client.handshake?.headers?.authorization?.split(' ')[1];

      if (!token) {
        throw new WsException('No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      client.userId = payload.sub;
      client.role = payload.role;

      return true;
    } catch (error) {
      this.logger.error(`WebSocket JWT validation failed: ${error.message}`);
      throw new WsException('Authentication failed');
    }
  }
}
