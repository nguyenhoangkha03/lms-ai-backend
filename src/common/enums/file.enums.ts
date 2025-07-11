export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

export enum FileAccessLevel {
  PUBLIC = 'public',
  ENROLLED_ONLY = 'enrolled_only',
  PREMIUM_ONLY = 'premium_only',
  PRIVATE = 'private',
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
