import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { WinstonService } from '@/logger/winston.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { AssessmentTakingService } from '../services/assessment-taking.service';
import {
  SessionHeartbeatDto,
  SecurityEventDto,
  UpdateProgressDto,
} from '../dto/assessment-taking.dto';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
@WebSocketGateway({
  namespace: '/assessment-sessions',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
export class AssessmentSessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeConnections = new Map<string, string>(); // socketId -> sessionToken

  constructor(
    private readonly takingService: AssessmentTakingService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(AssessmentSessionGateway.name);
  }

  async handleConnection(client: Socket) {
    try {
      const sessionToken = client.handshake.auth?.sessionToken;
      if (sessionToken) {
        this.activeConnections.set(client.id, sessionToken);
        await client.join(`session:${sessionToken}`);
        this.logger.log(`Client connected to session: ${sessionToken}`);
      }
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const sessionToken = this.activeConnections.get(client.id);
    if (sessionToken) {
      this.activeConnections.delete(client.id);
      await client.leave(`session:${sessionToken}`);
      this.logger.log(`Client disconnected from session: ${sessionToken}`);
    }
  }

  @SubscribeMessage('heartbeat')
  @UseGuards(JwtAuthGuard)
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SessionHeartbeatDto,
    @CurrentUser() user: User,
  ) {
    try {
      const sessionToken = this.activeConnections.get(client.id);
      if (!sessionToken) {
        client.emit('error', { message: 'No active session' });
        return;
      }

      const result = await this.takingService.heartbeat(sessionToken, data, user);
      client.emit('heartbeat_response', result);

      // Send warnings if any
      if (result.warnings.length > 0) {
        client.emit('session_warnings', result.warnings);
      }
    } catch (error) {
      this.logger.error('Heartbeat error:', error);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('security_event')
  @UseGuards(JwtAuthGuard)
  async handleSecurityEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SecurityEventDto,
    @CurrentUser() user: User,
  ) {
    try {
      const sessionToken = this.activeConnections.get(client.id);
      if (!sessionToken) {
        client.emit('error', { message: 'No active session' });
        return;
      }

      const result = await this.takingService.reportSecurityEvent(sessionToken, data, user);
      client.emit('security_event_response', result);

      if (result.sessionTerminated) {
        client.emit('session_terminated', {
          reason: 'Too many security violations',
        });
        client.disconnect();
      }
    } catch (error) {
      this.logger.error('Security event error:', error);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('update_progress')
  @UseGuards(JwtAuthGuard)
  async handleUpdateProgress(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateProgressDto,
    @CurrentUser() user: User,
  ) {
    try {
      const sessionToken = this.activeConnections.get(client.id);
      if (!sessionToken) {
        client.emit('error', { message: 'No active session' });
        return;
      }

      const result = await this.takingService.updateProgress(sessionToken, data, user);
      client.emit('progress_updated', result);
    } catch (error) {
      this.logger.error('Progress update error:', error);
      client.emit('error', { message: error.message });
    }
  }

  // Event handlers for broadcasting
  @OnEvent('assessment.session.started')
  handleSessionStarted(payload: any) {
    this.server.to(`session:${payload.sessionId}`).emit('session_started', payload);
  }

  @OnEvent('assessment.session.completed')
  handleSessionCompleted(payload: any) {
    this.server.to(`session:${payload.sessionId}`).emit('session_completed', payload);
  }

  @OnEvent('assessment.security.violation')
  handleSecurityViolation(payload: any) {
    this.server.to(`session:${payload.sessionId}`).emit('security_violation', payload);
  }

  @OnEvent('assessment.answer.submitted')
  handleAnswerSubmitted(payload: any) {
    this.server.to(`session:${payload.sessionId}`).emit('answer_submitted', payload);
  }

  @OnEvent('assessment.time.warning')
  handleTimeWarning(payload: any) {
    this.server.to(`session:${payload.sessionId}`).emit('time_warning', payload);
  }

  // Admin/Teacher monitoring
  @SubscribeMessage('monitor_session')
  @UseGuards(JwtAuthGuard)
  async handleMonitorSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
    @CurrentUser() user: User,
  ) {
    try {
      if (user.userType !== 'admin' && user.userType !== 'teacher') {
        client.emit('error', { message: 'Insufficient permissions' });
        return;
      }

      const analytics = await this.takingService.getSessionAnalytics(data.sessionId, user);
      client.emit('session_analytics', analytics);

      // Join monitoring room
      await client.join(`monitor:${data.sessionId}`);
    } catch (error) {
      this.logger.error('Monitor session error:', error);
      client.emit('error', { message: error.message });
    }
  }
}
