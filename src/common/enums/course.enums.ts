export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  ALL_LEVELS = 'all_levels',
}

export enum CourseStatus {
  DRAFT = 'draft',
  UNDER_REVIEW = 'under_review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  SUSPENDED = 'suspended',
}

export enum LessonType {
  VIDEO = 'video',
  TEXT = 'text',
  AUDIO = 'audio',
  INTERACTIVE = 'interactive',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  LIVE_SESSION = 'live_session',
  DOWNLOAD = 'download',
}

export enum EnrollmentStatus {
  ENROLLED = 'enrolled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
  PAUSED = 'paused',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  ACTIVE = 'active',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum LessonProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

export enum FileRelatedType {
  COURSE_THUMBNAIL = 'course_thumbnail',
  COURSE_TRAILER = 'course_trailer',
  LESSON_VIDEO = 'lesson_video',
  LESSON_ATTACHMENT = 'lesson_attachment',
  USER_AVATAR = 'user_avatar',
  USER_COVER = 'user_cover',
  ASSIGNMENT_SUBMISSION = 'assignment_submission',
  CERTIFICATE = 'certificate',
  CHAT_ATTACHMENT = 'chat_attachment',
  VIDEO_RECORDING = 'video_recording',
  TEACHER_RESUME = 'teacher_resume',
  TEACHER_DEGREE = 'teacher_degree',
  TEACHER_CERTIFICATION = 'teacher_certification',
  TEACHER_ID_DOCUMENT = 'teacher_id_document',
  TEACHER_PORTFOLIO = 'teacher_portfolio',
  COURSE_PROMOTIONAL = 'course_promotional',
  COURSE_MATERIAL = 'course_material',
}

export enum CourseLanguage {
  ENGLISH = 'en',
  VIETNAMESE = 'vi',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  CHINESE = 'zh',
  JAPANESE = 'ja',
  KOREAN = 'ko',
}

export enum CoursePricing {
  FREE = 'free',
  PAID = 'paid',
  SUBSCRIPTION = 'subscription',
  FREEMIUM = 'freemium',
}
