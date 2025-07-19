export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  ERROR = 'error',
}

export enum TutoringMode {
  ADAPTIVE = 'adaptive',
  GUIDED = 'guided',
  EXPLORATORY = 'exploratory',
  ASSESSMENT = 'assessment',
  REMEDIATION = 'remediation',
  ENRICHMENT = 'enrichment',
}

export enum LearningStyleType {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  KINESTHETIC = 'kinesthetic',
  READING_WRITING = 'reading_writing',
  MULTIMODAL = 'multimodal',
  BALANCED = 'balanced',
  UNKNOWN = 'unknown',
}

export enum LearningModalityType {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  KINESTHETIC = 'kinesthetic',
  READING_WRITING = 'reading_writing',
  MULTIMODAL = 'multimodal',
}

export enum InteractionType {
  QUESTION = 'question',
  HINT_REQUEST = 'hint_request',
  CLARIFICATION = 'clarification',
  FEEDBACK_REQUEST = 'feedback_request',
  CONCEPT_EXPLANATION = 'concept_explanation',
  PROBLEM_SOLVING = 'problem_solving',
  ASSESSMENT_ANSWER = 'assessment_answer',
  EXPLORATION = 'exploration',
  HELP_SEEKING = 'help_seeking',
}

export enum ResponseType {
  DIRECT_ANSWER = 'direct_answer',
  SOCRATIC_QUESTION = 'socratic_question',
  HINT = 'hint',
  EXPLANATION = 'explanation',
  EXAMPLE = 'example',
  ANALOGY = 'analogy',
  ENCOURAGEMENT = 'encouragement',
  REDIRECTION = 'redirection',
  ASSESSMENT = 'assessment',
}

export enum ContentType {
  LESSON = 'lesson',
  EXERCISE = 'exercise',
  QUIZ = 'quiz',
  EXPLANATION = 'explanation',
  EXAMPLE = 'example',
  SIMULATION = 'simulation',
  VIDEO = 'video',
  INTERACTIVE = 'interactive',
  READING = 'reading',
}

export enum DifficultyLevel {
  VERY_EASY = 'very_easy',
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  VERY_HARD = 'very_hard',
  ADAPTIVE = 'adaptive',
}

export enum AdaptationType {
  DIFFICULTY_ADJUSTMENT = 'difficulty_adjustment',
  CONTENT_VARIATION = 'content_variation',
  PACING_ADJUSTMENT = 'pacing_adjustment',
  LEARNING_STYLE_ADAPTATION = 'learning_style_adaptation',
  REMEDIATION = 'remediation',
  ENRICHMENT = 'enrichment',
  PATH_REDIRECTION = 'path_redirection',
}

export enum HintType {
  STRATEGIC = 'strategic',
  CONCEPTUAL = 'conceptual',
  PROCEDURAL = 'procedural',
  METACOGNITIVE = 'metacognitive',
  MOTIVATIONAL = 'motivational',
  DIRECTIONAL = 'directional',
  ELABORATIVE = 'elaborative',
}

export enum HintTrigger {
  USER_REQUEST = 'user_request',
  STRUGGLE_DETECTION = 'struggle_detection',
  TIME_THRESHOLD = 'time_threshold',
  INCORRECT_ATTEMPTS = 'incorrect_attempts',
  CONFUSION_INDICATORS = 'confusion_indicators',
  PROACTIVE_SUPPORT = 'proactive_support',
  LEARNING_OBJECTIVE = 'learning_objective',
}

export enum QuestionAnsweringType {
  FACTUAL = 'factual',
  CONCEPTUAL = 'conceptual',
  PROCEDURAL = 'procedural',
  METACOGNITIVE = 'metacognitive',
  ANALYTICAL = 'analytical',
  SYNTHETIC = 'synthetic',
  EVALUATIVE = 'evaluative',
}

export enum LearningPathStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  MODIFIED = 'modified',
  DISCONTINUED = 'discontinued',
}

export enum AdaptationTrigger {
  PERFORMANCE_THRESHOLD = 'performance_threshold',
  TIME_THRESHOLD = 'time_threshold',
  ENGAGEMENT_DROP = 'engagement_drop',
  MASTERY_ACHIEVED = 'mastery_achieved',
  PREREQUISITE_GAP = 'prerequisite_gap',
  LEARNING_STYLE_MISMATCH = 'learning_style_mismatch',
  USER_PREFERENCE = 'user_preference',
}

export enum TutoringStrategy {
  DIRECT_INSTRUCTION = 'direct_instruction',
  SOCRATIC_METHOD = 'socratic_method',
  SCAFFOLDING = 'scaffolding',
  MODELING = 'modeling',
  COLLABORATIVE_LEARNING = 'collaborative_learning',
  PROBLEM_BASED = 'problem_based',
  INQUIRY_BASED = 'inquiry_based',
  GAMIFICATION = 'gamification',
}

export enum FeedbackType {
  IMMEDIATE = 'immediate',
  DELAYED = 'delayed',
  ELABORATIVE = 'elaborative',
  CORRECTIVE = 'corrective',
  POSITIVE_REINFORCEMENT = 'positive_reinforcement',
  CONSTRUCTIVE_CRITICISM = 'constructive_criticism',
  PEER_COMPARISON = 'peer_comparison',
  SELF_ASSESSMENT = 'self_assessment',
}

export enum EngagementLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export enum MasteryLevel {
  NOT_ATTEMPTED = 'not_attempted',
  NOVICE = 'novice',
  DEVELOPING = 'developing',
  PROFICIENT = 'proficient',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum AdaptationConfidence {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export enum LearningObjectiveType {
  KNOWLEDGE = 'knowledge',
  COMPREHENSION = 'comprehension',
  APPLICATION = 'application',
  ANALYSIS = 'analysis',
  SYNTHESIS = 'synthesis',
  EVALUATION = 'evaluation',
}
