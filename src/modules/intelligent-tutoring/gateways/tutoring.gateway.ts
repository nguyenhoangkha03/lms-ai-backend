import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';
import { TutoringSessionService } from '../services/tutoring-session.service';
import { QuestionAnsweringService } from '../services/question-answering.service';
import { HintGenerationService } from '../services/hint-generation.service';

@WebSocketGateway({
  namespace: '/tutoring',
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3001',
    credentials: true,
  },
})
export class TutoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TutoringGateway.name);
  private connectedUsers = new Map<string, Socket>();

  constructor(
    private readonly tutoringSessionService: TutoringSessionService,
    private readonly questionAnsweringService: QuestionAnsweringService,
    private readonly hintGenerationService: HintGenerationService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from connected users
    for (const [userId, socket] of this.connectedUsers.entries()) {
      if (socket.id === client.id) {
        this.connectedUsers.delete(userId);
        break;
      }
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('join-session')
  async handleJoinSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
    @CurrentUser() user: UserPayload,
  ) {
    try {
      const session = await this.tutoringSessionService.getSession(data.sessionId);

      if (session.studentId !== user.sub) {
        client.emit('error', { message: 'Unauthorized access to session' });
        return;
      }

      client.join(`session:${data.sessionId}`);
      this.connectedUsers.set(user.sub, client);

      client.emit('session-joined', {
        sessionId: data.sessionId,
        sessionData: session,
      });

      this.logger.log(`User ${user.sub} joined session ${data.sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to join session: ${error.message}`);
      client.emit('error', { message: 'Failed to join session' });
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('ask-question')
  async handleAskQuestion(
    @MessageBody() data: { sessionId: string; question: string; context?: string },
    @ConnectedSocket() client: Socket,
    @CurrentUser() user: UserPayload,
  ) {
    try {
      const answer = await this.questionAnsweringService.answerQuestion(user.sub, {
        sessionId: data.sessionId,
        question: data.question,
        context: data.context,
      });

      client.emit('question-answered', {
        questionId: `q_${Date.now()}`,
        answer,
        timestamp: new Date(),
      });

      // Broadcast to session participants
      this.server.to(`session:${data.sessionId}`).emit('session-activity', {
        type: 'question-asked',
        studentId: user.sub,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to answer question: ${error.message}`);
      client.emit('error', { message: 'Failed to process question' });
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('request-hint')
  async handleRequestHint(
    @MessageBody()
    data: {
      sessionId: string;
      currentProblem: string;
      userAttempt?: string;
      hintLevel?: number;
    },
    @ConnectedSocket() client: Socket,
    @CurrentUser() user: UserPayload,
  ) {
    try {
      const hint = await this.hintGenerationService.generateHint(user.sub, {
        sessionId: data.sessionId,
        currentProblem: data.currentProblem,
        userAttempt: data.userAttempt,
        hintLevel: data.hintLevel,
      });

      client.emit('hint-generated', {
        hintId: `h_${Date.now()}`,
        hint,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to generate hint: ${error.message}`);
      client.emit('error', { message: 'Failed to generate hint' });
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('update-progress')
  async handleUpdateProgress(
    @MessageBody()
    data: {
      sessionId: string;
      completionPercentage: number;
      currentTopic?: string;
    },
    @ConnectedSocket() client: Socket,
    @CurrentUser() user: UserPayload,
  ) {
    try {
      await this.tutoringSessionService.updateSession(data.sessionId, {
        completionPercentage: data.completionPercentage,
      });

      // Broadcast progress update
      this.server.to(`session:${data.sessionId}`).emit('progress-updated', {
        studentId: user.sub,
        completionPercentage: data.completionPercentage,
        currentTopic: data.currentTopic,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to update progress: ${error.message}`);
      client.emit('error', { message: 'Failed to update progress' });
    }
  }

  // Method to send notifications to specific users
  sendNotificationToUser(userId: string, notification: any) {
    const userSocket = this.connectedUsers.get(userId);
    if (userSocket) {
      userSocket.emit('notification', notification);
    }
  }

  // Method to broadcast session updates
  broadcastSessionUpdate(sessionId: string, update: any) {
    this.server.to(`session:${sessionId}`).emit('session-update', update);
  }

  // Method to send adaptive content suggestions
  sendAdaptiveContentSuggestion(userId: string, suggestion: any) {
    const userSocket = this.connectedUsers.get(userId);
    if (userSocket) {
      userSocket.emit('adaptive-content-suggestion', suggestion);
    }
  }
}
