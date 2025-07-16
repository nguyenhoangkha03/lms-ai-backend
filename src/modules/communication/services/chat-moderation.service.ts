import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatModeration } from '../entities/chat-moderation.entity';
import { ChatRoom } from '../entities/chat-room.entity';
// import { PythonAIServiceService } from '../../python-ai-service/python-ai-service.service';
import { ConfigService } from '@nestjs/config';

interface ModerationResult {
  blocked: boolean;
  reason?: string;
  severity?: string;
  confidence?: number;
  suggestedAction?: string;
  flaggedWords?: string[];
  categories?: string[];
}

@Injectable()
export class ChatModerationService {
  private readonly logger = new Logger(ChatModerationService.name);
  private readonly profanityWords: Set<string>;
  private readonly spamPatterns: RegExp[];

  constructor(
    @InjectRepository(ChatModeration)
    private readonly moderationRepository: Repository<ChatModeration>,
    @InjectRepository(ChatRoom)
    private readonly roomRepository: Repository<ChatRoom>,
    // private readonly pythonAIService: PythonAIServiceService,
    private readonly configService: ConfigService,
  ) {
    // Initialize profanity filter
    this.profanityWords = new Set([
      // Add profanity words here - keeping minimal for example
      'spam',
      'abuse',
      'inappropriate',
    ]);

    // Initialize spam detection patterns
    this.spamPatterns = [
      /(.)\1{4,}/g, // Repeated characters
      /https?:\/\/[^\s]+/gi, // URLs (might be spam)
      /(.+?)(?:\1){3,}/gi, // Repeated phrases
    ];
  }

  async checkMessage(content: string, roomId: string, userId: string): Promise<ModerationResult> {
    try {
      const room = await this.roomRepository.findOne({
        where: { id: roomId },
        select: ['moderationSettings'],
      });

      if (!room?.moderationSettings?.autoModeration) {
        return { blocked: false };
      }

      // Check profanity filter
      const profanityResult = this.checkProfanity(content, room.moderationSettings);
      if (profanityResult.blocked) {
        await this.createModerationRecord({
          roomId,
          targetUserId: userId,
          action: 'flag_content',
          reason: profanityResult.reason!,
          evidence: { flaggedWords: profanityResult.flaggedWords },
          isAutomated: true,
          severity: profanityResult.severity,
        });
        return profanityResult;
      }

      // Check spam detection
      const spamResult = this.checkSpam(content);
      if (spamResult.blocked) {
        await this.createModerationRecord({
          roomId,
          targetUserId: userId,
          action: 'flag_content',
          reason: spamResult.reason!,
          isAutomated: true,
          severity: spamResult.severity,
        });
        return spamResult;
      }

      // AI-powered content moderation
      //   if (this.configService.get('CONTENT_MODERATION_ENABLED') === 'true') {
      //     const aiResult = await this.checkWithAI(content);
      //     if (aiResult.blocked) {
      //       await this.createModerationRecord({
      //         roomId,
      //         targetUserId: userId,
      //         action: 'flag_content',
      //         reason: aiResult.reason!,
      //         evidence: { aiAnalysis: aiResult },
      //         isAutomated: true,
      //         severity: aiResult.severity,
      //         confidenceScore: aiResult.confidence,
      //       });
      //       return aiResult;
      //     }
      //   }

      return { blocked: false };
    } catch (error) {
      this.logger.error(`Error in content moderation: ${error.message}`);
      // Fail open - don't block if moderation fails
      return { blocked: false };
    }
  }

  private checkProfanity(content: string, settings: any): ModerationResult {
    if (!settings?.profanityFilter) {
      return { blocked: false };
    }

    const words = content.toLowerCase().split(/\s+/);
    const bannedWords = new Set([...this.profanityWords, ...(settings.bannedWords || [])]);

    const flaggedWords = words.filter(word => bannedWords.has(word));

    if (flaggedWords.length > 0) {
      return {
        blocked: true,
        reason: 'Content contains inappropriate language',
        severity: 'medium',
        flaggedWords,
      };
    }

    return { blocked: false };
  }

  private checkSpam(content: string): ModerationResult {
    // Check for repeated characters
    if (this.spamPatterns[0].test(content)) {
      return {
        blocked: true,
        reason: 'Content appears to be spam (repeated characters)',
        severity: 'low',
      };
    }

    // Check for too many URLs
    const urlMatches = content.match(this.spamPatterns[1]);
    if (urlMatches && urlMatches.length > 3) {
      return {
        blocked: true,
        reason: 'Content contains too many URLs',
        severity: 'medium',
      };
    }

    // Check for repeated phrases
    if (this.spamPatterns[2].test(content)) {
      return {
        blocked: true,
        reason: 'Content appears to be spam (repeated phrases)',
        severity: 'low',
      };
    }

    return { blocked: false };
  }

  //   private async checkWithAI(content: string): Promise<ModerationResult> {
  //     try {
  //       const threshold = parseFloat(
  //         this.configService.get('AI_MODERATION_CONFIDENCE_THRESHOLD', '0.8'),
  //       );

  //       // Call AI moderation service
  //       const response = await this.pythonAIService.moderateContent({
  //         text: content,
  //         categories: ['harassment', 'hate', 'self-harm', 'sexual', 'violence'],
  //         threshold,
  //       });

  //       if (response.flagged) {
  //         return {
  //           blocked: true,
  //           reason: `AI detected ${response.categories.join(', ')}`,
  //           severity: this.mapAISeverity(response.confidence),
  //           confidence: response.confidence,
  //           categories: response.categories,
  //         };
  //       }

  //       return { blocked: false };
  //     } catch (error) {
  //       this.logger.error(`AI moderation error: ${error.message}`);
  //       return { blocked: false };
  //     }
  //   }

  private mapAISeverity(confidence: number): string {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  }

  async createModerationRecord(data: {
    messageId?: string;
    roomId: string;
    targetUserId: string;
    moderatorId?: string;
    action: string;
    reason: string;
    notes?: string;
    severity?: string;
    isAutomated?: boolean;
    confidenceScore?: number;
    evidence?: any;
  }): Promise<ChatModeration> {
    const moderation = this.moderationRepository.create({
      ...data,
      moderatorId: data.moderatorId || 'system',
      status: 'applied',
      appliedAt: new Date(),
    });

    return this.moderationRepository.save(moderation);
  }

  async getModerationHistory(
    roomId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ records: ChatModeration[]; total: number }> {
    const [records, total] = await this.moderationRepository.findAndCount({
      where: { roomId },
      relations: ['targetUser', 'moderator', 'message'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { records, total };
  }

  async appealModeration(
    moderationId: string,
    userId: string,
    reason: string,
  ): Promise<ChatModeration | null> {
    const moderation = await this.moderationRepository.findOne({
      where: { id: moderationId, targetUserId: userId },
    });

    if (!moderation) {
      throw new Error('Moderation record not found');
    }

    const appeal = {
      submittedAt: new Date(),
      submittedBy: userId,
      reason,
    };

    await this.moderationRepository.update(moderationId, {
      status: 'appealed',
      appeal,
    });

    return this.moderationRepository.findOne({ where: { id: moderationId } });
  }

  async reviewAppeal(
    moderationId: string,
    reviewerId: string,
    decision: 'approved' | 'denied',
    reviewNotes?: string,
  ): Promise<ChatModeration | null> {
    const moderation = await this.moderationRepository.findOne({
      where: { id: moderationId, status: 'appealed' },
    });

    if (!moderation) {
      throw new Error('Appeal not found');
    }

    const updatedAppeal = {
      ...moderation.appeal,
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
      decision,
      reviewNotes,
    };

    const newStatus = decision === 'approved' ? 'reversed' : 'applied';

    await this.moderationRepository.update(moderationId, {
      status: newStatus,
      appeal: updatedAppeal,
    });

    return this.moderationRepository.findOne({ where: { id: moderationId } });
  }

  async muteUser(
    roomId: string,
    userId: string,
    moderatorId: string,
    duration: number, // in minutes
    reason: string,
  ): Promise<ChatModeration> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + duration);

    return this.createModerationRecord({
      roomId,
      targetUserId: userId,
      moderatorId,
      action: 'mute',
      reason,
      severity: 'medium',
    });
  }

  async banUser(
    roomId: string,
    userId: string,
    moderatorId: string,
    reason: string,
    permanent: boolean = false,
  ): Promise<ChatModeration> {
    const _expiresAt = permanent ? null : new Date(Date.now() + 24 * 60 * 60 * 1000);

    return this.createModerationRecord({
      roomId,
      targetUserId: userId,
      moderatorId,
      action: 'ban',
      reason,
      severity: 'high',
    });
  }

  async isUserMuted(roomId: string, userId: string): Promise<boolean> {
    const mute = await this.moderationRepository.findOne({
      where: {
        roomId,
        targetUserId: userId,
        action: 'mute',
        status: 'applied',
      },
      order: { createdAt: 'DESC' },
    });

    return mute ? !mute.isExpired : false;
  }

  async isUserBanned(roomId: string, userId: string): Promise<boolean> {
    const ban = await this.moderationRepository.findOne({
      where: {
        roomId,
        targetUserId: userId,
        action: 'ban',
        status: 'applied',
      },
      order: { createdAt: 'DESC' },
    });

    return ban ? !ban.isExpired : false;
  }
}
