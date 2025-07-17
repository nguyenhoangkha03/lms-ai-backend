export enum UserType {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  INSTRUCTOR = 'instructor',
  TEACHER = 'teacher',
  MODERATOR = 'moderator',
  STUDENT = 'student',
  GUEST = 'guest',
  VIEWER = 'viewer',
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  DELETED = 'deleted',
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

export enum DifficultyPreference {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
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
