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
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
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
}

export enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never',
}
