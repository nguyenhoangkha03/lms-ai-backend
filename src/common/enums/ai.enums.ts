export enum RecommendationType {
  NEXT_LESSON = 'next_lesson',
  REVIEW_CONTENT = 'review_content',
  PRACTICE_QUIZ = 'practice_quiz',
  SUPPLEMENTARY_MATERIAL = 'supplementary_material',
  COURSE_RECOMMENDATION = 'course_recommendation',
  STUDY_SCHEDULE = 'study_schedule',
  LEARNING_PATH = 'learning_path',
  SKILL_IMPROVEMENT = 'skill_improvement',
  PEER_STUDY_GROUP = 'peer_study_group',
  TUTOR_SESSION = 'tutor_session',
  BREAK_SUGGESTION = 'break_suggestion',
  DIFFICULTY_ADJUSTMENT = 'difficulty_adjustment',
}

export enum RecommendationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  ACCEPTED = 'accepted',
  DISMISSED = 'dismissed',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}
