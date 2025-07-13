import { FeedbackCategory, FeedbackSeverity } from '../entities/feedback.entity';

export interface GradingConfiguration {
  autoGradeMultipleChoice: boolean;
  useAiForEssays: boolean;
  requireManualReview: boolean;
  confidenceThreshold: number;
  autoPublishGrades: boolean;
  enableDetailedFeedback: boolean;
}

export interface GradingCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
  levels: GradingLevel[];
}

export interface GradingLevel {
  score: number;
  title: string;
  description: string;
}

export interface GradingResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  letterGrade: string;
  isPassing: boolean;
  criteriaScores: Record<string, number>;
  feedback: string[];
  aiConfidence?: number;
}

export interface ManualGradingSession {
  attemptId: string;
  assessmentTitle: string;
  studentName: string;
  submissionDate: Date;
  questions: ManualGradingQuestion[];
  totalMaxScore: number;
  estimatedTime: number;
}

export interface ManualGradingQuestion {
  id: string;
  type: string;
  text: string;
  studentAnswer: any;
  maxScore: number;
  rubric?: GradingCriteria[];
  suggestions?: string[];
}

export interface EssayFeedback {
  category: FeedbackCategory | string;
  severity: FeedbackSeverity | string;
  content: string;
  suggestion?: string;
  startPosition?: number;
  endPosition?: number;
  highlightedText?: string;
}
