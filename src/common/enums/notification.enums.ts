export enum NotificationType {
  COURSE_ENROLLMENT = 'course_enrollment',
  LESSON_AVAILABLE = 'lesson_available',
  ASSIGNMENT_DUE = 'assignment_due',
  QUIZ_AVAILABLE = 'quiz_available',
  GRADE_POSTED = 'grade_posted',
  MESSAGE_RECEIVED = 'message_received',
  VIDEO_SESSION_STARTING = 'video_session_starting',
  CERTIFICATE_EARNED = 'certificate_earned',
  COURSE_COMPLETED = 'course_completed',
  REMINDER_STUDY = 'reminder_study',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SECURITY_ALERT = 'security_alert',
  ANNOUNCEMENT = 'announcement',
  FRIEND_REQUEST = 'friend_request',
  FORUM_REPLY = 'forum_reply',
  CHAT_MESSAGE = 'chat_message',

  // Collaborative learning
  STUDY_GROUP_INVITATION = 'study_group_invitation',
  PEER_REVIEW_ASSIGNED = 'peer_review_assigned',
  PROJECT_DEADLINE = 'project_deadline',
  COLLABORATION_REQUEST = 'collaboration_request',
  GROUP_MESSAGE = 'group_message',
  WHITEBOARD_SHARED = 'whiteboard_shared',
  NOTE_SHARED = 'note_shared',
  TASK_ASSIGNED = 'task_assigned',

  // Missing ones (add these 👇)
  CHAT_MENTION = 'chat_mention',
  CHAT_EVERYONE = 'chat_everyone',
  FORUM_THREAD_REPLY = 'forum_thread_reply',
  FORUM_MENTION = 'forum_mention',
  FORUM_REPUTATION_GAINED = 'forum_reputation_gained',
  REPORT_HANDLED = 'report_handled',
  ASSESSMENT_STARTED = 'assessment_started',
  ASSESSMENT_COMPLETED = 'assessment_completed',
  ASSESSMENT_SUBMITTED = 'assessment_submitted',
  SECURITY_VIOLATION = 'security_violation',
  SESSION_TERMINATED = 'session_terminated',
  TIME_WARNING = 'time_warning',
  SESSION_EXPIRED = 'session_expired',
  VIDEO_SESSION_REMINDER = 'video_session_reminder',
  ASSESSMENT_TERMINATED = 'assessment_terminated',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationCategory {
  ACADEMIC = 'academic',
  SOCIAL = 'social',
  SYSTEM = 'system',
  SECURITY = 'security',
  MARKETING = 'marketing',
  ADMINISTRATIVE = 'administrative',
  CHAT = 'chat',
  VIDEO_SESSION = 'video_session',
  FORUM_REPORT = 'forum_report',
  FORUM = 'forum',
}

export enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never',
}

// New enums for multi-channel
export enum DeliveryChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  SLACK = 'slack',
  DISCORD = 'discord',
  WEBHOOK = 'webhook',
}

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  OPENED = 'opened',
  CLICKED = 'clicked',
  UNSUBSCRIBED = 'unsubscribed',
}

export enum TemplateType {
  EMAIL_HTML = 'email_html',
  EMAIL_TEXT = 'email_text',
  PUSH_NOTIFICATION = 'push_notification',
  SMS_MESSAGE = 'sms_message',
  IN_APP_ALERT = 'in_app_alert',
  SLACK_MESSAGE = 'slack_message',
  DISCORD_EMBED = 'discord_embed',
}
