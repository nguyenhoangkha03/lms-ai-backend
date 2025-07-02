export enum ChatRoomType {
  GENERAL = 'general',
  COURSE = 'course',
  LESSON = 'lesson',
  STUDY_GROUP = 'study_group',
  OFFICE_HOURS = 'office_hours',
  HELP_DESK = 'help_desk',
  ANNOUNCEMENTS = 'announcements',
  PRIVATE = 'private',
  PUBLIC = 'public',
}

export enum ChatRoomStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  LOCKED = 'locked',
  MAINTENANCE = 'maintenance',
}

export enum ParticipantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  GUEST = 'guest',
  ATTENDEE = 'attendee',
  PRESENTER = 'presenter',
  CO_HOST = 'co_host',
  HOST = 'host',
}

export enum ParticipantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
  MUTED = 'muted',
  AWAY = 'away',
  BUSY = 'busy',
}

export enum ParticipantConnectionStatus {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
  LINK = 'link',
  CODE = 'code',
  SYSTEM = 'system',
  ANNOUNCEMENT = 'announcement',
  POLL = 'poll',
  QUIZ = 'quiz',
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  DELETED = 'deleted',
}

export enum VideoSessionType {
  MEETING = 'meeting',
  WEBINAR = 'webinar',
  LECTURE = 'lecture',
  TUTORIAL = 'tutorial',
  OFFICE_HOURS = 'office_hours',
  STUDY_GROUP = 'study_group',
  EXAM = 'exam',
  WORKSHOP = 'workshop',
}

export enum VideoSessionStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
  FAILED = 'failed',
}

export enum VideoProvider {
  WEBRTC = 'webrtc',
  ZOOM = 'zoom',
  TEAMS = 'teams',
  MEET = 'meet',
  JITSI = 'jitsi',
  BIGBLUEBUTTON = 'bigbluebutton',
  CUSTOM = 'custom',
}
