import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { VideoSessionService } from '../services/video-session.service';
import { BreakoutRoomService } from '../services/breakout-room.service';
import { AttendanceTrackingService } from '../services/attendance-tracking.service';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  role?: string;
  sessionId?: string;
}

interface ParticipantState {
  userId: string;
  sessionId: string;
  isMuted: boolean;
  videoDisabled: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  breakoutRoomId?: string;
}

@WebSocketGateway({
  namespace: '/video',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class VideoGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(VideoGateway.name);

  @WebSocketServer()
  server: Server;

  private participantStates = new Map<string, ParticipantState>();

  private sessionParticipants = new Map<string, Set<string>>(); // sessionId -> userIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly videoSessionService: VideoSessionService,
    private readonly breakoutRoomService: BreakoutRoomService,
    private readonly attendanceService: AttendanceTrackingService,
  ) {}

  afterInit(_server: Server) {
    this.logger.log('Video WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn('Video client attempted to connect without token');
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      client.userId = payload.sub;
      client.role = payload.role;

      this.logger.log(`Video client connected: ${client.userId}`);

      client.emit('connected', {
        userId: client.userId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Video connection error: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.userId || !client.sessionId) return;

    this.logger.log(`Video client disconnected: ${client.userId}`);

    await this.handleLeaveSession(client.sessionId, client);

    this.participantStates.delete(client.userId);

    const sessionParticipants = this.sessionParticipants.get(client.sessionId);
    if (sessionParticipants) {
      sessionParticipants.delete(client.userId);
    }
  }

  @SubscribeMessage('join_session')
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe())
  async handleJoinSession(
    @MessageBody() data: { sessionId: string; deviceInfo?: any },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const { sessionId } = data;

      const result = await this.videoSessionService.joinSession(sessionId, {
        userId: client.userId!,
        deviceInfo: data.deviceInfo,
      });

      client.sessionId = sessionId;
      await client.join(`session_${sessionId}`);

      if (!this.sessionParticipants.has(sessionId)) {
        this.sessionParticipants.set(sessionId, new Set());
      }
      this.sessionParticipants.get(sessionId)?.add(client.userId!);

      const participantState: ParticipantState = {
        userId: client.userId!,
        sessionId,
        isMuted: true, // Start muted by default
        videoDisabled: true,
        isScreenSharing: false,
        handRaised: false,
      };
      this.participantStates.set(client.userId!, participantState);

      // Notify client of successful join
      client.emit('session_joined', {
        sessionId,
        session: result.session,
        participant: result.participant,
        connectionInfo: result.connectionInfo,
        timestamp: new Date(),
      });

      // Notify other participants
      client.to(`session_${sessionId}`).emit('participant_joined', {
        sessionId,
        participant: result.participant,
        state: participantState,
        timestamp: new Date(),
      });

      this.logger.debug(`User ${client.userId} joined video session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error joining video session: ${error.message}`);
      client.emit('error', {
        message: 'Failed to join session',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('leave_session')
  @UseGuards(WsJwtGuard)
  async handleLeaveSession(
    @MessageBody() sessionId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      await this.videoSessionService.leaveSession(sessionId, client.userId!);

      // Remove from socket room
      await client.leave(`session_${sessionId}`);

      // Clean up tracking
      const sessionParticipants = this.sessionParticipants.get(sessionId);
      if (sessionParticipants) {
        sessionParticipants.delete(client.userId!);
      }
      this.participantStates.delete(client.userId!);

      client.sessionId = undefined;

      // Notify other participants
      this.server.to(`session_${sessionId}`).emit('participant_left', {
        sessionId,
        userId: client.userId,
        timestamp: new Date(),
      });

      client.emit('session_left', {
        sessionId,
        timestamp: new Date(),
      });

      this.logger.debug(`User ${client.userId} left video session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error leaving video session: ${error.message}`);
      client.emit('error', {
        message: 'Failed to leave session',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('toggle_mute')
  @UseGuards(WsJwtGuard)
  async handleToggleMute(
    @MessageBody() data: { isMuted: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.sessionId) return;

    const participantState = this.participantStates.get(client.userId!);
    if (participantState) {
      participantState.isMuted = data.isMuted;
      this.participantStates.set(client.userId!, participantState);

      // Broadcast to session
      this.server.to(`session_${client.sessionId}`).emit('participant_state_changed', {
        userId: client.userId,
        state: { isMuted: data.isMuted },
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('toggle_video')
  @UseGuards(WsJwtGuard)
  async handleToggleVideo(
    @MessageBody() data: { videoDisabled: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.sessionId) return;

    const participantState = this.participantStates.get(client.userId!);
    if (participantState) {
      participantState.videoDisabled = data.videoDisabled;
      this.participantStates.set(client.userId!, participantState);

      // Broadcast to session
      this.server.to(`session_${client.sessionId}`).emit('participant_state_changed', {
        userId: client.userId,
        state: { videoDisabled: data.videoDisabled },
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('toggle_screen_share')
  @UseGuards(WsJwtGuard)
  async handleToggleScreenShare(
    @MessageBody() data: { isScreenSharing: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.sessionId) return;

    const participantState = this.participantStates.get(client.userId!);
    if (participantState) {
      participantState.isScreenSharing = data.isScreenSharing;
      this.participantStates.set(client.userId!, participantState);

      // Broadcast to session
      this.server.to(`session_${client.sessionId}`).emit('participant_state_changed', {
        userId: client.userId,
        state: { isScreenSharing: data.isScreenSharing },
        timestamp: new Date(),
      });

      // Notify about screen share start/stop
      this.server.to(`session_${client.sessionId}`).emit('screen_share_toggled', {
        userId: client.userId,
        isScreenSharing: data.isScreenSharing,
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('raise_hand')
  @UseGuards(WsJwtGuard)
  async handleRaiseHand(
    @MessageBody() data: { handRaised: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.sessionId) return;

    const participantState = this.participantStates.get(client.userId!);
    if (participantState) {
      participantState.handRaised = data.handRaised;
      this.participantStates.set(client.userId!, participantState);

      // Broadcast to session
      this.server.to(`session_${client.sessionId}`).emit('hand_raised', {
        userId: client.userId,
        handRaised: data.handRaised,
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('webrtc_signal')
  @UseGuards(WsJwtGuard)
  async handleWebRTCSignal(
    @MessageBody()
    data: {
      targetUserId: string;
      signal: any;
      type: 'offer' | 'answer' | 'ice-candidate';
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.sessionId) return;

    // Forward WebRTC signaling data to target user
    const targetSocketId = this.findSocketByUserId(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('webrtc_signal', {
        fromUserId: client.userId,
        signal: data.signal,
        type: data.type,
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('join_breakout_room')
  @UseGuards(WsJwtGuard)
  async handleJoinBreakoutRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.sessionId) return;

    try {
      await this.breakoutRoomService.assignParticipantToRoom(
        client.sessionId,
        client.userId!,
        data.roomId,
      );

      // Update participant state
      const participantState = this.participantStates.get(client.userId!);
      if (participantState) {
        participantState.breakoutRoomId = data.roomId;
        this.participantStates.set(client.userId!, participantState);
      }

      // Join breakout room socket
      await client.join(`breakout_${data.roomId}`);

      client.emit('breakout_room_joined', {
        roomId: data.roomId,
        timestamp: new Date(),
      });

      // Notify main session
      this.server.to(`session_${client.sessionId}`).emit('participant_moved_to_breakout', {
        userId: client.userId,
        roomId: data.roomId,
        timestamp: new Date(),
      });
    } catch (error) {
      client.emit('error', {
        message: 'Failed to join breakout room',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('leave_breakout_room')
  @UseGuards(WsJwtGuard)
  async handleLeaveBreakoutRoom(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.sessionId) return;

    try {
      await this.breakoutRoomService.removeParticipantFromRoom(client.sessionId, client.userId!);

      // Update participant state
      const participantState = this.participantStates.get(client.userId!);
      if (participantState) {
        const previousRoomId = participantState.breakoutRoomId;
        participantState.breakoutRoomId = undefined;
        this.participantStates.set(client.userId!, participantState);

        // Leave breakout room socket
        if (previousRoomId) {
          await client.leave(`breakout_${previousRoomId}`);
        }
      }

      client.emit('breakout_room_left', {
        timestamp: new Date(),
      });

      // Notify main session
      this.server.to(`session_${client.sessionId}`).emit('participant_returned_from_breakout', {
        userId: client.userId,
        timestamp: new Date(),
      });
    } catch (error) {
      client.emit('error', {
        message: 'Failed to leave breakout room',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('send_chat_message')
  @UseGuards(WsJwtGuard)
  async handleSendChatMessage(
    @MessageBody()
    data: {
      message: string;
      targetType: 'session' | 'breakout' | 'private';
      targetId?: string;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.sessionId) return;

    const chatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromUserId: client.userId,
      message: data.message,
      timestamp: new Date(),
    };

    switch (data.targetType) {
      case 'session':
        this.server.to(`session_${client.sessionId}`).emit('chat_message', chatMessage);
        break;

      case 'breakout':
        const participantState = this.participantStates.get(client.userId!);
        if (participantState?.breakoutRoomId) {
          this.server
            .to(`breakout_${participantState.breakoutRoomId}`)
            .emit('chat_message', chatMessage);
        }
        break;

      case 'private':
        if (data.targetId) {
          const targetSocketId = this.findSocketByUserId(data.targetId);
          if (targetSocketId) {
            this.server.to(targetSocketId).emit('private_message', chatMessage);
            client.emit('private_message', chatMessage); // Echo to sender
          }
        }
        break;
    }
  }

  @SubscribeMessage('update_connection_quality')
  @UseGuards(WsJwtGuard)
  async handleUpdateConnectionQuality(
    @MessageBody()
    data: {
      audioQuality: number;
      videoQuality: number;
      networkLatency: number;
      jitter: number;
      packetLoss: number;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.sessionId) return;

    // Store connection quality data for analytics
    // This could be sent to the analytics service or stored in cache

    // Notify session about quality issues if severe
    if (data.networkLatency > 500 || data.packetLoss > 5) {
      this.server.to(`session_${client.sessionId}`).emit('connection_quality_warning', {
        userId: client.userId,
        quality: data,
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('report_technical_issue')
  @UseGuards(WsJwtGuard)
  async handleReportTechnicalIssue(
    @MessageBody()
    data: {
      issue: string;
      severity: 'low' | 'medium' | 'high';
      details?: any;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.sessionId) return;

    // Log technical issue
    this.logger.warn(`Technical issue reported by ${client.userId}: ${data.issue}`);

    // Notify session host/moderators
    this.server.to(`session_${client.sessionId}`).emit('technical_issue_reported', {
      userId: client.userId,
      issue: data.issue,
      severity: data.severity,
      details: data.details,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('create_poll')
  @UseGuards(WsJwtGuard)
  async handleCreatePoll(
    @MessageBody()
    data: {
      question: string;
      options: string[];
      allowMultiple?: boolean;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.sessionId) return;

    const poll = {
      id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question: data.question,
      options: data.options,
      allowMultiple: data.allowMultiple || false,
      createdBy: client.userId,
      responses: [],
      isActive: true,
      createdAt: new Date(),
    };

    // Broadcast poll to session
    this.server.to(`session_${client.sessionId}`).emit('poll_created', {
      poll,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('answer_poll')
  @UseGuards(WsJwtGuard)
  async handleAnswerPoll(
    @MessageBody()
    data: {
      pollId: string;
      answers: string[];
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.sessionId) return;

    // Broadcast poll response (to host/moderators only)
    this.server.to(`session_${client.sessionId}`).emit('poll_response', {
      pollId: data.pollId,
      userId: client.userId,
      answers: data.answers,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('get_session_participants')
  @UseGuards(WsJwtGuard)
  async handleGetSessionParticipants(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.sessionId) return;

    try {
      const participants = await this.videoSessionService.getSessionParticipants(client.sessionId);

      // Add real-time states
      const participantsWithStates = participants.map(participant => ({
        ...participant,
        state: this.participantStates.get(participant.userId),
      }));

      client.emit('session_participants', {
        participants: participantsWithStates,
        timestamp: new Date(),
      });
    } catch (error) {
      client.emit('error', {
        message: 'Failed to get participants',
        error: error.message,
      });
    }
  }

  // Host/Moderator only events
  @SubscribeMessage('mute_participant')
  @UseGuards(WsJwtGuard)
  async handleMuteParticipant(
    @MessageBody() data: { targetUserId: string; mute: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.sessionId) return;

    // TODO: Check if client has host/moderator permissions

    const targetSocketId = this.findSocketByUserId(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('force_mute', {
        muted: data.mute,
        by: client.userId,
        timestamp: new Date(),
      });

      // Update participant state
      const participantState = this.participantStates.get(data.targetUserId);
      if (participantState) {
        participantState.isMuted = data.mute;
        this.participantStates.set(data.targetUserId, participantState);
      }
    }
  }

  @SubscribeMessage('remove_participant')
  @UseGuards(WsJwtGuard)
  async handleRemoveParticipant(
    @MessageBody() data: { targetUserId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.sessionId) return;

    // TODO: Check if client has host/moderator permissions

    const targetSocketId = this.findSocketByUserId(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('removed_from_session', {
        by: client.userId,
        reason: 'Removed by host',
        timestamp: new Date(),
      });

      // Force disconnect the target user
      const targetSocket = this.server.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.disconnect();
      }
    }
  }

  @SubscribeMessage('end_session')
  @UseGuards(WsJwtGuard)
  async handleEndSession(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.sessionId) return;

    try {
      await this.videoSessionService.endSession(client.sessionId, client.userId!);

      // Notify all participants
      this.server.to(`session_${client.sessionId}`).emit('session_ended', {
        by: client.userId,
        timestamp: new Date(),
      });

      // Disconnect all participants from this session
      const sessionParticipants = this.sessionParticipants.get(client.sessionId);
      if (sessionParticipants) {
        sessionParticipants.forEach(userId => {
          const socketId = this.findSocketByUserId(userId);
          if (socketId) {
            const socket = this.server.sockets.sockets.get(socketId);
            if (socket) {
              socket.leave(`session_${client.sessionId}`);
            }
          }
        });

        this.sessionParticipants.delete(client.sessionId);
      }
    } catch (error) {
      client.emit('error', {
        message: 'Failed to end session',
        error: error.message,
      });
    }
  }

  // Private helper methods
  private findSocketByUserId(userId: string): string | null {
    for (const [socketId, socket] of this.server.sockets.sockets) {
      if ((socket as AuthenticatedSocket).userId === userId) {
        return socketId;
      }
    }
    return null;
  }

  // Broadcast methods for external use
  broadcastToSession(sessionId: string, event: string, data: any): void {
    this.server.to(`session_${sessionId}`).emit(event, data);
  }

  broadcastToUser(userId: string, event: string, data: any): void {
    const socketId = this.findSocketByUserId(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  getSessionParticipantCount(sessionId: string): number {
    return this.sessionParticipants.get(sessionId)?.size || 0;
  }

  getActiveParticipantStates(sessionId: string): ParticipantState[] {
    const participants = this.sessionParticipants.get(sessionId);
    if (!participants) return [];

    return Array.from(participants)
      .map(userId => this.participantStates.get(userId))
      .filter(state => state !== undefined);
  }
}
