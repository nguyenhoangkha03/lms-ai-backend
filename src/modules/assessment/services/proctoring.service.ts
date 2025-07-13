import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { CacheService } from '@/cache/cache.service';
import { AssessmentSession } from '../entities/assessment-session.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ProctoringConfiguration {
  webcamRequired: boolean;
  audioRecording: boolean;
  screenRecording: boolean;
  environmentCheck: boolean;
  identityVerification: boolean;
  behaviorAnalysis: boolean;
  lockdownBrowser: boolean;
  allowedApplications: string[];
  blockedWebsites: string[];
}

export interface ProctoringEvent {
  type:
    | 'webcam_blocked'
    | 'audio_detected'
    | 'face_not_detected'
    | 'multiple_faces'
    | 'suspicious_movement'
    | 'unauthorized_application'
    | 'prohibited_website'
    | 'screen_share_detected'
    | 'external_monitor';
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  confidence: number;
}

@Injectable()
export class ProctoringService {
  constructor(
    @InjectRepository(AssessmentSession)
    private readonly sessionRepository: Repository<AssessmentSession>,
    private readonly logger: WinstonService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(ProctoringService.name);
  }

  async initializeProctoring(
    sessionId: string,
    config: ProctoringConfiguration,
  ): Promise<{
    initialized: boolean;
    requirements: string[];
    proctoringToken: string;
  }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const requirements: string[] = [];

    if (config.webcamRequired) {
      requirements.push('Webcam access is required');
    }

    if (config.audioRecording) {
      requirements.push('Microphone access is required');
    }

    if (config.screenRecording) {
      requirements.push('Screen recording permission is required');
    }

    if (config.environmentCheck) {
      requirements.push('Environment scan is required');
    }

    if (config.identityVerification) {
      requirements.push('Identity verification is required');
    }

    const proctoringToken = this.generateProctoringToken(sessionId);

    await this.sessionRepository.update(sessionId, {
      metadata: JSON.stringify({
        ...session.metadataJson,
        proctoring: {
          enabled: true,
          config,
          token: proctoringToken,
          initializedAt: new Date().toISOString(),
        },
      }),
    });

    await this.cacheService.set(`proctoring:${proctoringToken}`, { sessionId, config }, 3600);

    this.logger.log(`Initialized proctoring for session ${sessionId}`);

    return {
      initialized: true,
      requirements,
      proctoringToken,
    };
  }

  async validateEnvironment(
    proctoringToken: string,
    environmentData: {
      webcamAvailable: boolean;
      microphoneAvailable: boolean;
      screenRecordingAvailable: boolean;
      runningApplications: string[];
      networkConnections: string[];
      displays: any[];
    },
  ): Promise<{
    valid: boolean;
    violations: string[];
    warnings: string[];
  }> {
    const proctoringSession = await this.cacheService.get<{
      sessionId: string;
      config: ProctoringConfiguration;
    }>(`proctoring:${proctoringToken}`);

    if (!proctoringSession) {
      throw new Error('Invalid proctoring token');
    }

    const { config } = proctoringSession;
    const violations: string[] = [];
    const warnings: string[] = [];

    if (config.webcamRequired && !environmentData.webcamAvailable) {
      violations.push('Webcam is required but not available');
    }

    if (config.audioRecording && !environmentData.microphoneAvailable) {
      violations.push('Microphone is required but not available');
    }

    if (config.screenRecording && !environmentData.screenRecordingAvailable) {
      violations.push('Screen recording permission is required');
    }

    if (config.allowedApplications?.length > 0) {
      const unauthorizedApps = environmentData.runningApplications.filter(
        app => !config.allowedApplications.includes(app),
      );
      if (unauthorizedApps.length > 0) {
        violations.push(`Unauthorized applications detected: ${unauthorizedApps.join(', ')}`);
      }
    }

    if (environmentData.displays.length > 1) {
      warnings.push('Multiple displays detected - ensure no unauthorized content is visible');
    }

    const valid = violations.length === 0;

    this.logger.log(
      `Environment validation for ${proctoringToken}: ${valid ? 'PASSED' : 'FAILED'}`,
    );

    return { valid, violations, warnings };
  }
  async processProctoringEvent(
    proctoringToken: string,
    event: ProctoringEvent,
  ): Promise<{
    processed: boolean;
    actionRequired: boolean;
    recommendedAction?: string;
  }> {
    const proctoringSession = await this.cacheService.get<{
      sessionId: string;
      config: ProctoringConfiguration;
    }>(`proctoring:${proctoringToken}`);

    if (!proctoringSession) {
      throw new Error('Invalid proctoring token');
    }

    const { sessionId } = proctoringSession;

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const metadata = session.metadataJson;
    if (!metadata.proctoringEvents) {
      metadata.proctoringEvents = [];
    }
    metadata.proctoringEvents.push(event);

    await this.sessionRepository.update(sessionId, {
      metadata: JSON.stringify(metadata),
    });

    let actionRequired = false;
    let recommendedAction: string | undefined;

    switch (event.severity) {
      case 'critical':
        actionRequired = true;
        recommendedAction = 'terminate_session';
        break;
      case 'high':
        actionRequired = true;
        recommendedAction = 'flag_for_review';
        break;
      case 'medium':
        if (event.type === 'multiple_faces' || event.type === 'unauthorized_application') {
          actionRequired = true;
          recommendedAction = 'warn_student';
        }
        break;
    }

    this.eventEmitter.emit('assessment.proctoring.event', {
      sessionId,
      studentId: session.studentId,
      event,
      actionRequired,
      recommendedAction,
      timestamp: new Date(),
    });

    this.logger.log(
      `Processed proctoring event: ${event.type} (${event.severity}) for session ${sessionId}`,
    );

    return {
      processed: true,
      actionRequired,
      recommendedAction,
    };
  }

  async generateBehaviorAnalysis(sessionId: string): Promise<{
    overall_score: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    analysis: {
      face_detection: any;
      movement_patterns: any;
      attention_tracking: any;
      anomaly_detection: any;
    };
    recommendations: string[];
  }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const proctoringEvents = session.metadataJson.proctoringEvents || [];

    const faceDetectionScore = this.analyzeFaceDetection(proctoringEvents);
    const movementScore = this.analyzeMovementPatterns(proctoringEvents);
    const attentionScore = this.analyzeAttentionTracking(proctoringEvents);
    const anomalyScore = this.analyzeAnomalies(proctoringEvents);

    const overall_score = Math.round(
      (faceDetectionScore + movementScore + attentionScore + anomalyScore) / 4,
    );

    let risk_level: 'low' | 'medium' | 'high' | 'critical';
    if (overall_score >= 80) risk_level = 'low';
    else if (overall_score >= 60) risk_level = 'medium';
    else if (overall_score >= 40) risk_level = 'high';
    else risk_level = 'critical';

    const recommendations: string[] = [];
    if (faceDetectionScore < 70) {
      recommendations.push('Multiple face detection instances - verify student identity');
    }
    if (movementScore < 60) {
      recommendations.push('Excessive movement detected - review for suspicious behavior');
    }
    if (anomalyScore < 50) {
      recommendations.push('Multiple anomalies detected - manual review recommended');
    }

    return {
      overall_score,
      risk_level,
      analysis: {
        face_detection: {
          score: faceDetectionScore,
          events: proctoringEvents.filter(e => e.type.includes('face')),
        },
        movement_patterns: {
          score: movementScore,
          events: proctoringEvents.filter(e => e.type.includes('movement')),
        },
        attention_tracking: {
          score: attentionScore,
          events: proctoringEvents.filter(e => e.type.includes('attention')),
        },
        anomaly_detection: {
          score: anomalyScore,
          events: proctoringEvents.filter(e => e.severity === 'critical'),
        },
      },
      recommendations,
    };
  }

  async getProctoringSessionData(sessionId: string): Promise<{
    session: any;
    events: ProctoringEvent[];
    recordings: {
      webcam?: string;
      screen?: string;
      audio?: string;
    };
    analysis: any;
  }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['student', 'assessment'],
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const events = session.metadataJson.proctoringEvents || [];
    const analysis = await this.generateBehaviorAnalysis(sessionId);

    const recordings = {
      webcam: session.metadataJson.proctoring?.webcamRecordingUrl,
      screen: session.metadataJson.proctoring?.screenRecordingUrl,
      audio: session.metadataJson.proctoring?.audioRecordingUrl,
    };

    return {
      session: {
        id: session.id,
        studentId: session.studentId,
        studentName: `${session.student?.firstName} ${session.student?.lastName}`,
        assessmentTitle: session.assessment?.title,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration: session.durationInSeconds,
        status: session.status,
      },
      events,
      recordings,
      analysis,
    };
  }

  private generateProctoringToken(sessionId: string): string {
    return `prc_${sessionId.replace(/-/g, '')}_${Date.now()}`;
  }

  private analyzeFaceDetection(events: ProctoringEvent[]): number {
    const faceEvents = events.filter(e => e.type.includes('face'));
    if (faceEvents.length === 0) return 100;

    const violations = faceEvents.filter(
      e => e.type === 'face_not_detected' || e.type === 'multiple_faces',
    );
    return Math.max(0, 100 - violations.length * 20);
  }

  private analyzeMovementPatterns(events: ProctoringEvent[]): number {
    const movementEvents = events.filter(e => e.type.includes('movement'));
    if (movementEvents.length === 0) return 100;

    const suspiciousMovement = movementEvents.filter(
      e => e.severity === 'high' || e.severity === 'critical',
    );
    return Math.max(0, 100 - suspiciousMovement.length * 15);
  }

  private analyzeAttentionTracking(events: ProctoringEvent[]): number {
    const attentionEvents = events.filter(e => e.confidence < 0.7);
    return Math.max(0, 100 - attentionEvents.length * 10);
  }

  private analyzeAnomalies(events: ProctoringEvent[]): number {
    const criticalEvents = events.filter(e => e.severity === 'critical');
    const highEvents = events.filter(e => e.severity === 'high');

    return Math.max(0, 100 - criticalEvents.length * 30 - highEvents.length * 15);
  }
}
