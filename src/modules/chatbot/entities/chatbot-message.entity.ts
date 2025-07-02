import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { MessageSender, MessageType, MessageStatus } from '@/common/enums/chatbot.enums';
import { ChatbotConversation } from './chatbot-conversation.entity';

@Entity('chatbot_messages')
@Index(['conversationId'])
@Index(['sender'])
@Index(['messageType'])
@Index(['status'])
@Index(['timestamp'])
@Index(['isImportant'])
export class ChatbotMessage extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Conversation this message belongs to',
  })
  conversationId: string;

  @Column({
    type: 'enum',
    enum: MessageSender,
    comment: 'Who sent the message',
  })
  sender: MessageSender;

  @Column({
    type: 'text',
    comment: 'Message content',
  })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
    comment: 'Type of message',
  })
  messageType: MessageType;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
    comment: 'Message status',
  })
  status: MessageStatus;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Message timestamp',
  })
  timestamp: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Rich content attachments',
  })
  attachments?: {
    type: 'image' | 'video' | 'audio' | 'document' | 'link' | 'code' | 'math';
    url?: string;
    content?: string;
    metadata?: Record<string, any>;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'AI processing metadata',
  })
  aiMetadata?: {
    modelUsed?: string;
    confidence?: number;
    processingTime?: number;
    tokens?: { input: number; output: number; total: number };
    intent?: string;
    entities?: { [key: string]: any };
    sentiment?: { score: number; label: string };
    topics?: string[];
    responseType?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'User input analysis',
  })
  inputAnalysis?: {
    originalText?: string;
    correctedText?: string;
    language?: string;
    complexity?: number;
    keywords?: string[];
    questionType?: string;
    urgency?: 'low' | 'medium' | 'high';
    category?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Interactive elements in message',
  })
  interactiveElements?: {
    quickReplies?: { text: string; value: string }[];
    buttons?: { text: string; action: string; url?: string }[];
    cards?: { title: string; description: string; image?: string; actions?: any[] }[];
    forms?: { fields: any[]; submitAction: string }[];
    polls?: { question: string; options: string[] };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Personalization data',
  })
  personalization?: {
    userPreferences?: Record<string, any>;
    adaptationLevel?: string;
    customizations?: Record<string, any>;
    learningStyle?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Educational content metadata',
  })
  educationalContent?: {
    concepts?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    prerequisites?: string[];
    learningObjectives?: string[];
    relatedLessons?: string[];
    exercises?: any[];
    assessments?: any[];
  };

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether message contains important information',
  })
  isImportant: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether message is marked for follow-up',
  })
  needsFollowUp: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether message was flagged by user',
  })
  isFlagged: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Flag reason if message was flagged',
  })
  flagReason?: string;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    comment: 'User rating for this message (1.0 - 5.0)',
  })
  userRating?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'User feedback for this specific message',
  })
  userFeedback?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Error information if message failed',
  })
  errorInfo?: {
    errorCode?: string;
    errorMessage?: string;
    stackTrace?: string;
    retryCount?: number;
    lastRetryAt?: Date;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Analytics and tracking data',
  })
  analytics?: {
    readAt?: Date;
    interactionCount?: number;
    linkClicks?: number;
    buttonClicks?: { [buttonId: string]: number };
    timeToRead?: number;
    helpfulness?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional message metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ChatbotConversation, conversation => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: ChatbotConversation;

  // Virtual properties
  get isFromUser(): boolean {
    return this.sender === MessageSender.USER;
  }

  get isFromBot(): boolean {
    return this.sender === MessageSender.BOT;
  }

  get hasAttachments(): boolean {
    return !!(this.attachments && this.attachments.length > 0);
  }

  get hasInteractiveElements(): boolean {
    return (
      (this.interactiveElements?.quickReplies?.length ?? 0) > 0 ||
      (this.interactiveElements?.buttons?.length ?? 0) > 0 ||
      (this.interactiveElements?.cards?.length ?? 0) > 0
    );
  }

  get confidenceScore(): number {
    return this.aiMetadata?.confidence || 0;
  }

  get processingTimeMs(): number {
    return this.aiMetadata?.processingTime || 0;
  }

  get wasHelpful(): boolean {
    return this.userRating ? this.userRating >= 3.0 : false;
  }
}
