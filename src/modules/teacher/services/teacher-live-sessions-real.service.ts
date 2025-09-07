import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { VideoSession } from '../../communication/entities/video-session.entity';
import { VideoParticipant } from '../../communication/entities/video-participant.entity';
import { 
  VideoSessionStatus, 
  VideoSessionType, 
  VideoProvider,
  ParticipantRole,
  ParticipantConnectionStatus
} from '@/common/enums/communication.enums';
import { Course } from '../../course/entities/course.entity';

@Injectable()
export class TeacherLiveSessionsRealService {
  constructor(
    @InjectRepository(VideoSession)
    private readonly sessionRepository: Repository<VideoSession>,
    @InjectRepository(VideoParticipant)
    private readonly participantRepository: Repository<VideoParticipant>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherLiveSessionsRealService.name);
  }

  async getLiveSessions(teacherId: string, status?: string): Promise<any> {
    this.logger.log(`Getting live sessions for teacher: ${teacherId}, status: ${status}`);

    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.course', 'course')
      .leftJoinAndSelect('session.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .where('session.hostId = :teacherId', { teacherId })
      .orderBy('session.scheduledStart', 'DESC');

    if (status && status !== 'all') {
      queryBuilder.andWhere('session.status = :status', { status });
    }

    const sessions = await queryBuilder.getMany();

    const sessionData = sessions.map(session => ({
      id: session.id,
      title: session.title,
      description: session.description,
      courseId: session.courseId,
      courseName: session.course?.title || 'No Course',
      scheduledAt: session.scheduledStart,
      duration: session.scheduledDuration / 60, // Convert seconds to minutes
      status: session.status,
      roomId: `room-${session.id}`,
      maxParticipants: session.maxParticipants,
      currentParticipants: session.currentParticipants,
      isRecorded: session.isRecording,
      recordingUrl: session.recordingUrl,
      meetingUrl: session.meetingUrl,
      materials: [], // TODO: Implement materials relationship
      attendance: session.participants?.map(p => ({
        studentId: p.userId,
        studentName: p.user?.displayName || p.user?.firstName + ' ' + p.user?.lastName,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt
      })) || [],
      createdAt: session.createdAt,
    }));

    return {
      sessions: sessionData,
      totalCount: sessionData.length,
      summary: {
        scheduled: sessionData.filter(s => s.status === VideoSessionStatus.SCHEDULED).length,
        live: sessionData.filter(s => s.status === VideoSessionStatus.LIVE).length,
        completed: sessionData.filter(s => s.status === VideoSessionStatus.COMPLETED).length,
      }
    };
  }

  async getSessionById(teacherId: string, sessionId: string): Promise<any> {
    this.logger.log(`Getting session ${sessionId} for teacher: ${teacherId}`);

    const session = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.course', 'course')
      .leftJoinAndSelect('session.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .where('session.id = :sessionId', { sessionId })
      .andWhere('session.hostId = :teacherId', { teacherId })
      .getOne();

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    return {
      id: session.id,
      title: session.title,
      description: session.description,
      courseId: session.courseId,
      courseName: session.course?.title || 'No Course',
      scheduledAt: session.scheduledStart,
      duration: session.scheduledDuration / 60,
      status: session.status,
      roomId: `room-${session.id}`,
      maxParticipants: session.maxParticipants,
      currentParticipants: session.currentParticipants,
      isRecorded: session.isRecording,
      recordingUrl: session.recordingUrl,
      meetingUrl: session.meetingUrl,
      materials: [], // TODO: Implement materials
      attendance: session.participants?.map(p => ({
        studentId: p.userId,
        studentName: p.user?.displayName || p.user?.firstName + ' ' + p.user?.lastName,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt
      })) || [],
      chat: [], // TODO: Implement chat messages
      polls: session.polls || [],
      whiteboard: null, // TODO: Implement whiteboard
      settings: session.settings || {
        allowChat: true,
        allowMicrophone: false,
        allowCamera: false,
        allowScreenShare: true,
        recordSession: true,
        requireApproval: false,
      },
      createdAt: session.createdAt,
    };
  }

  async createSession(teacherId: string, sessionData: any): Promise<any> {
    this.logger.log(`Creating live session for teacher: ${teacherId}`);

    // Verify course exists if courseId is provided
    let course: any = null;
    const courseId = sessionData.courseId && sessionData.courseId.trim() !== '' ? sessionData.courseId : null;
    
    if (courseId) {
      course = await this.courseRepository.findOne({
        where: { id: courseId }
      });
      if (!course) {
        throw new NotFoundException('Course not found');
      }
    }

    const session = this.sessionRepository.create({
      title: sessionData.title,
      description: sessionData.description,
      hostId: teacherId,
      courseId: courseId,
      sessionType: VideoSessionType.LECTURE,
      status: VideoSessionStatus.SCHEDULED,
      scheduledStart: new Date(sessionData.scheduledAt),
      scheduledEnd: new Date(new Date(sessionData.scheduledAt).getTime() + sessionData.duration * 60000),
      maxParticipants: sessionData.maxParticipants || 50,
      currentParticipants: 0,
      totalParticipants: 0,
      provider: VideoProvider.WEBRTC,
      isRecording: sessionData.isRecorded || false,
      requiresRegistration: false,
      waitingRoomEnabled: sessionData.settings?.requireApproval || false,
      settings: sessionData.settings || {
        muteParticipantsOnEntry: true,
        allowParticipantScreenShare: false,
        allowParticipantChat: true,
        allowParticipantRecording: false,
        autoStartRecording: sessionData.isRecorded || false,
        enableBreakoutRooms: false,
        enablePolls: true,
        enableWhiteboard: true,
        enableAnnotations: true,
        participantVideoOnEntry: false,
        hostVideoOnEntry: true,
        audioOnEntry: false,
        lockMeeting: false,
      }
    });

    const savedSession = await this.sessionRepository.save(session);

    // Add host as participant
    const hostParticipant = this.participantRepository.create({
      sessionId: savedSession.id,
      userId: teacherId,
      role: ParticipantRole.HOST,
      connectionStatus: ParticipantConnectionStatus.CONNECTED,
      isMuted: false,
      videoDisabled: false,
      isScreenSharing: false,
      handRaised: false,
      inWaitingRoom: false
    });
    await this.participantRepository.save(hostParticipant);

    return {
      id: savedSession.id,
      title: savedSession.title,
      description: savedSession.description,
      courseId: savedSession.courseId,
      scheduledAt: savedSession.scheduledStart,
      duration: sessionData.duration,
      status: savedSession.status,
      roomId: `room-${savedSession.id}`,
      maxParticipants: savedSession.maxParticipants,
      currentParticipants: 0,
      isRecorded: savedSession.isRecording,
      materials: sessionData.materials || [],
      settings: savedSession.settings,
      createdAt: savedSession.createdAt,
    };
  }

  async updateSession(teacherId: string, sessionId: string, updates: any): Promise<any> {
    this.logger.log(`Updating session ${sessionId} for teacher: ${teacherId}`);

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, hostId: teacherId }
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    const updateData: any = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.scheduledAt) {
      updateData.scheduledStart = new Date(updates.scheduledAt);
      updateData.scheduledEnd = new Date(new Date(updates.scheduledAt).getTime() + (updates.duration || 90) * 60000);
    }
    if (updates.duration) {
      updateData.scheduledEnd = new Date(session.scheduledStart.getTime() + updates.duration * 60000);
    }
    if (updates.maxParticipants) updateData.maxParticipants = updates.maxParticipants;
    if (updates.isRecorded !== undefined) updateData.isRecording = updates.isRecorded;
    if (updates.settings) updateData.settings = { ...session.settings, ...updates.settings };

    await this.sessionRepository.update(sessionId, updateData);

    return {
      id: sessionId,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }

  async deleteSession(teacherId: string, sessionId: string): Promise<void> {
    this.logger.log(`Deleting session ${sessionId} for teacher: ${teacherId}`);
    
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, hostId: teacherId }
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    // Only allow deletion of scheduled sessions
    if (session.status !== VideoSessionStatus.SCHEDULED) {
      throw new Error('Can only delete scheduled sessions');
    }

    await this.sessionRepository.delete(sessionId);
  }

  async startSession(teacherId: string, sessionId: string): Promise<{ meetingUrl: string }> {
    this.logger.log(`Starting session ${sessionId} for teacher: ${teacherId}`);

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, hostId: teacherId }
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    const meetingUrl = `${process.env.FRONTEND_URL}/teacher/live/${sessionId}`;
    
    await this.sessionRepository.update(sessionId, {
      status: VideoSessionStatus.LIVE,
      actualStart: new Date(),
      meetingUrl: meetingUrl
    });

    return { meetingUrl };
  }

  async endSession(teacherId: string, sessionId: string): Promise<{ recordingUrl?: string }> {
    this.logger.log(`Ending session ${sessionId} for teacher: ${teacherId}`);

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, hostId: teacherId }
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    const recordingUrl = session.isRecording 
      ? `${process.env.RECORDINGS_URL}/session-${sessionId}-recording.mp4`
      : undefined;

    await this.sessionRepository.update(sessionId, {
      status: VideoSessionStatus.COMPLETED,
      actualEnd: new Date(),
      recordingUrl: recordingUrl
    });

    return { recordingUrl };
  }

  async getSessionAttendance(teacherId: string, sessionId: string): Promise<any> {
    this.logger.log(`Getting attendance for session ${sessionId}, teacher: ${teacherId}`);

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, hostId: teacherId },
      relations: ['participants', 'participants.user']
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    const attendance = session.participants?.map(p => ({
      studentId: p.userId,
      studentName: p.user?.displayName || p.user?.firstName + ' ' + p.user?.lastName || 'Unknown User',
      studentEmail: p.user?.email || '',
      joinedAt: p.joinedAt,
      leftAt: p.leftAt,
      duration: p.joinedAt && p.leftAt ? Math.floor((p.leftAt.getTime() - p.joinedAt.getTime()) / (1000 * 60)) : 0,
      participated: !!p.joinedAt,
    })) || [];

    const totalInvited = session.maxParticipants || 0;
    const totalAttended = attendance.filter(a => a.participated).length;

    return {
      sessionId,
      totalInvited,
      totalAttended,
      attendanceRate: totalInvited > 0 ? Math.round((totalAttended / totalInvited) * 100) : 0,
      attendance,
    };
  }

  async sendChatMessage(teacherId: string, sessionId: string, messageData: any): Promise<any> {
    this.logger.log(`Sending chat message in session ${sessionId}, teacher: ${teacherId}`);

    // TODO: Implement real chat message storage
    return {
      id: `chat-${Date.now()}`,
      userId: teacherId,
      userName: 'Teacher',
      message: messageData.message,
      timestamp: new Date().toISOString(),
      type: 'teacher',
    };
  }

  async createPoll(teacherId: string, sessionId: string, pollData: any): Promise<any> {
    this.logger.log(`Creating poll in session ${sessionId}, teacher: ${teacherId}`);

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, hostId: teacherId }
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    const poll = {
      id: `poll-${Date.now()}`,
      question: pollData.question,
      options: pollData.options,
      type: pollData.type || 'multiple_choice',
      isActive: true,
      responses: [],
      createdAt: new Date(),
    };

    // Add poll to session
    const currentPolls = session.polls || [];
    currentPolls.push(poll);

    await this.sessionRepository.update(sessionId, {
      polls: currentPolls
    });

    return poll;
  }

  async getSessionStatistics(teacherId: string): Promise<any> {
    this.logger.log(`Getting session statistics for teacher: ${teacherId}`);

    const sessions = await this.sessionRepository.find({
      where: { hostId: teacherId },
      relations: ['participants']
    });

    const totalSessions = sessions.length;
    const scheduledSessions = sessions.filter(s => s.status === VideoSessionStatus.SCHEDULED).length;
    const liveSessions = sessions.filter(s => s.status === VideoSessionStatus.LIVE).length;
    const completedSessions = sessions.filter(s => s.status === VideoSessionStatus.COMPLETED).length;
    
    const totalParticipants = sessions.reduce((sum, s) => sum + s.totalParticipants, 0);
    const averageAttendance = totalSessions > 0 ? Math.round(totalParticipants / totalSessions) : 0;
    const totalDuration = sessions
      .filter(s => s.actualStart && s.actualEnd)
      .reduce((sum, s) => sum + s.duration, 0) / 60; // Convert to minutes
    const recordedSessions = sessions.filter(s => s.isRecording).length;

    const upcomingSessions = sessions
      .filter(s => s.status === VideoSessionStatus.SCHEDULED)
      .sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime())
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        title: s.title,
        scheduledAt: s.scheduledStart,
        courseName: s.course?.title || 'No Course',
      }));

    const recentActivity = sessions
      .filter(s => s.status === VideoSessionStatus.COMPLETED)
      .sort((a, b) => (b.actualEnd?.getTime() || 0) - (a.actualEnd?.getTime() || 0))
      .slice(0, 5)
      .map(s => ({
        sessionId: s.id,
        action: 'session_completed',
        timestamp: s.actualEnd,
        details: `${s.title} completed`,
      }));

    return {
      totalSessions,
      scheduledSessions,
      liveSessions,
      completedSessions,
      totalParticipants,
      averageAttendance,
      totalDuration,
      recordedSessions,
      upcomingSessions,
      recentActivity,
    };
  }
}