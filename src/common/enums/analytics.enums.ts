export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  COURSE_VIEW = 'course_view',
  LESSON_START = 'lesson_start',
  LESSON_COMPLETE = 'lesson_complete',
  LESSON_PROGRESS = 'lesson_progress',
  VIDEO_PLAY = 'video_play',
  VIDEO_PAUSE = 'video_pause',
  VIDEO_SEEK = 'video_seek',
  VIDEO_COMPLETE = 'video_complete',
  QUIZ_START = 'quiz_start',
  QUIZ_SUBMIT = 'quiz_submit',
  QUIZ_COMPLETE = 'quiz_complete',
  ASSIGNMENT_START = 'assignment_start',
  ASSIGNMENT_SUBMIT = 'assignment_submit',
  DISCUSSION_POST = 'discussion_post',
  CHAT_MESSAGE = 'chat_message',
  FILE_DOWNLOAD = 'file_download',
  SEARCH = 'search',
  BOOKMARK_ADD = 'bookmark_add',
  NOTE_CREATE = 'note_create',
  HELP_REQUEST = 'help_request',
  COURSE_COMPLETE = 'course_complete',
  CERTIFICATE_EARN = 'certificate_earn',
}

export enum DeviceType {
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  MOBILE = 'mobile',
  UNKNOWN = 'unknown',
}

export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  TIMED_OUT = 'timed_out',
}

export enum PerformanceLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  AVERAGE = 'average',
  BELOW_AVERAGE = 'below_average',
  POOR = 'poor',
}

export enum LearningPatternType {
  CONSISTENT = 'consistent',
  BINGE_LEARNER = 'binge_learner',
  PROCRASTINATOR = 'procrastinator',
  PERFECTIONIST = 'perfectionist',
  EXPLORER = 'explorer',
  FOCUSED = 'focused',
  SOCIAL_LEARNER = 'social_learner',
  INDEPENDENT = 'independent',
}
