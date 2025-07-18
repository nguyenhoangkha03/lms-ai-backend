export enum StudyGroupType {
  COURSE_BASED = 'course_based',
  TOPIC_BASED = 'topic_based',
  PROJECT_BASED = 'project_based',
  SKILL_BASED = 'skill_based',
  EXAM_PREP = 'exam_prep',
  GENERAL = 'general',
}

export enum StudyGroupStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  FULL = 'full',
  ARCHIVED = 'archived',
  SUSPENDED = 'suspended',
}

export enum StudyGroupRole {
  OWNER = 'owner',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  GUEST = 'guest',
}

export enum WhiteboardToolType {
  PEN = 'pen',
  PENCIL = 'pencil',
  HIGHLIGHTER = 'highlighter',
  ERASER = 'eraser',
  TEXT = 'text',
  SHAPE = 'shape',
  IMAGE = 'image',
  STICKY_NOTE = 'sticky_note',
}

export enum WhiteboardPermission {
  VIEW_ONLY = 'view_only',
  DRAW = 'draw',
  EDIT = 'edit',
  ADMIN = 'admin',
}

export enum NoteType {
  PERSONAL = 'personal',
  SHARED = 'shared',
  COLLABORATIVE = 'collaborative',
  TEMPLATE = 'template',
}

export enum NoteStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum PeerReviewType {
  ASSIGNMENT = 'assignment',
  PROJECT = 'project',
  PRESENTATION = 'presentation',
  DISCUSSION = 'discussion',
  CODE_REVIEW = 'code_review',
}

export enum PeerReviewStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
}

export enum ProjectRole {
  LEADER = 'leader',
  MEMBER = 'member',
  REVIEWER = 'reviewer',
  OBSERVER = 'observer',
}

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
  BLOCKED = 'blocked',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}
