export enum AssessmentType {
  QUIZ = 'quiz',
  EXAM = 'exam',
  ASSIGNMENT = 'assignment',
  SURVEY = 'survey',
  PRACTICE = 'practice',
  FINAL_EXAM = 'final_exam',
  MIDTERM = 'midterm',
  PROJECT = 'project',
}

export enum AssessmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  SUSPENDED = 'suspended',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  FILL_IN_THE_BLANK = 'fill_in_the_blank',
  MATCHING = 'matching',
  ORDERING = 'ordering',
  NUMERIC = 'numeric',
  CODE = 'code',
}

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

export enum AttemptStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  ABANDONED = 'abandoned',
  TIMED_OUT = 'timed_out',
  FLAGGED = 'flagged',
}

export enum GradingStatus {
  PENDING = 'pending',
  GRADED = 'graded',
  REVIEWING = 'reviewing',
  DISPUTED = 'disputed',
  IN_PROGRESS = 'in_progress',
}

export enum GradingMethod {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  HYBRID = 'hybrid',
  PEER_REVIEW = 'peer_review',
}
