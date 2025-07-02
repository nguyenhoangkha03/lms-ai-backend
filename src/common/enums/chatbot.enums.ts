export enum ConversationStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ESCALATED = 'escalated',
  ARCHIVED = 'archived',
}

export enum ConversationType {
  GENERAL = 'general',
  ACADEMIC_HELP = 'academic_help',
  TECHNICAL_SUPPORT = 'technical_support',
  COURSE_GUIDANCE = 'course_guidance',
  CAREER_ADVICE = 'career_advice',
  STUDY_PLANNING = 'study_planning',
  ASSESSMENT_HELP = 'assessment_help',
  ONBOARDING = 'onboarding',
}

export enum MessageSender {
  USER = 'user',
  BOT = 'bot',
  SYSTEM = 'system',
}

export enum MessageType {
  TEXT = 'text',
  RICH_TEXT = 'rich_text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  FILE = 'file',
  INTERACTIVE = 'interactive',
  SYSTEM = 'system',
  TYPING = 'typing',
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  PROCESSING = 'processing',
}
