export enum UserType {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum LearningStyle {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  READING = 'reading',
  KINESTHETIC = 'kinesthetic',
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum SocialPlatform {
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
  GITHUB = 'github',
  PERSONAL_WEBSITE = 'personal_website',
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
}

export enum PermissionResource {
  USER = 'user',
  COURSE = 'course',
  LESSON = 'lesson',
  ASSESSMENT = 'assessment',
  GRADE = 'grade',
  ANALYTICS = 'analytics',
  SYSTEM = 'system',
  ALL = '*',
}
