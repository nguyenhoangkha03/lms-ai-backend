import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ConversationStatus, ConversationType } from '@/common/enums/chatbot.enums';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { ChatbotMessage } from './chatbot-message.entity';

@Entity('chatbot_conversations')
@Index(['userId'])
@Index(['courseId'])
@Index(['status'])
@Index(['conversationType'])
@Index(['startedAt'])
@Index(['endedAt'])
@Index(['isActive'])
export class ChatbotConversation extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User participating in conversation',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Related course context',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Conversation title',
  })
  title?: string;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
    comment: 'Current conversation status',
  })
  status: ConversationStatus;

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.GENERAL,
    comment: 'Type of conversation',
  })
  conversationType: ConversationType;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'When conversation started',
  })
  startedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When conversation ended',
  })
  endedAt?: Date;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether conversation is currently active',
  })
  isActive: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total number of messages in conversation',
  })
  messageCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of user messages',
  })
  userMessageCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of bot messages',
  })
  botMessageCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last message timestamp',
  })
  lastMessageAt?: Date;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'Who sent the last message (user/bot)',
  })
  lastMessageBy?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Current conversation context',
  })
  context?: {
    currentTopic?: string;
    userIntent?: string;
    entities?: { [key: string]: any };
    lastIntent?: string;
    conversationFlow?: string;
    userPreferences?: Record<string, any>;
    sessionData?: Record<string, any>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'User profile and learning context',
  })
  userProfile?: {
    learningStyle?: string;
    currentLevel?: string;
    interests?: string[];
    goals?: string[];
    weakAreas?: string[];
    strongAreas?: string[];
    preferredLanguage?: string;
    timezone?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Conversation history summary',
  })
  summary?: {
    mainTopics?: string[];
    resolvedIssues?: string[];
    pendingItems?: string[];
    actionItems?: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
    satisfactionScore?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'AI model configuration used',
  })
  aiConfig?: {
    modelVersion?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    contextWindow?: number;
    features?: string[];
    personalityTraits?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Learning analytics from conversation',
  })
  learningAnalytics?: {
    topicsDiscussed?: string[];
    conceptsExplained?: string[];
    questionsAsked?: number;
    helpRequests?: number;
    learningGaps?: string[];
    recommendedContent?: string[];
    followUpActions?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Conversation quality metrics',
  })
  qualityMetrics?: {
    avgResponseTime?: number;
    userSatisfaction?: number;
    issueResolutionRate?: number;
    handoffToHuman?: boolean;
    conversationRating?: number;
    helpfulnessScore?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Escalation information',
  })
  escalation?: {
    escalated?: boolean;
    escalatedAt?: Date;
    escalatedTo?: string;
    escalationReason?: string;
    escalationType?: 'technical' | 'academic' | 'behavioral' | 'other';
    resolvedAt?: Date;
    resolution?: string;
  };

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    comment: 'Overall conversation rating (1.0 - 5.0)',
  })
  rating?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'User feedback about the conversation',
  })
  feedback?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Integration data with external systems',
  })
  integrations?: {
    calendar?: { events: any[] };
    lms?: { courses: string[]; assignments: string[] };
    email?: { threadId?: string };
    slack?: { channelId?: string; threadId?: string };
    zoom?: { meetingId?: string };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional conversation metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Course, course => course.id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @OneToMany(() => ChatbotMessage, message => message.conversation)
  messages?: ChatbotMessage[];

  // Virtual properties
  get duration(): number {
    if (!this.endedAt) return 0;
    return Math.floor((this.endedAt.getTime() - this.startedAt.getTime()) / 1000);
  }

  get durationFormatted(): string {
    const dur = this.duration;
    if (dur === 0) return 'Ongoing';

    const hours = Math.floor(dur / 3600);
    const minutes = Math.floor((dur % 3600) / 60);
    const seconds = dur % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  get averageResponseTime(): number {
    return this.qualityMetrics?.avgResponseTime || 0;
  }

  get isLongConversation(): boolean {
    return this.messageCount > 20 || this.duration > 1800; // 30 minutes
  }

  get needsFollowUp(): boolean {
    return (
      (this.summary?.pendingItems?.length ?? 0) > 0 ||
      (this.summary?.actionItems?.length ?? 0) > 0 ||
      this.escalation?.escalated === true
    );
  }
}
