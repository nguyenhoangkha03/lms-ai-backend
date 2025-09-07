import { AssessmentType } from '@/common/enums/assessment.enums';

export interface TeacherDashboardStats {
  totalStudents: number;
  activeCourses: number;
  totalCourses: number;
  completedAssignments: number;
  pendingGrading: number;
  averageClassPerformance: number;
  thisMonthEnrollments: number;
  recentActivityCount: number;
}

export interface ClassOverview {
  courseId: string;
  courseName: string;
  totalStudents: number;
  activeStudents: number;
  averageProgress: number;
  averageScore: number;
  completionRate: number;
  lastActivity: string;
  upcomingDeadlines: number;
  recentSubmissions: number;
  strugglingStudents: number;
  excellingStudents: number;
  courseImage?: string;
  status: 'active' | 'draft' | 'completed' | 'archived' | 'inactive';
}

export interface TeacherActivityFeedItem {
  id: string;
  type:
    | 'student_enrolled'
    | 'assignment_submitted'
    | 'quiz_completed'
    | 'course_completed'
    | 'student_struggling'
    | 'achievement_earned';
  title: string;
  description: string;
  timestamp: string;
  studentName?: string;
  studentId?: string;
  courseId?: string;
  courseName?: string;
  priority: 'low' | 'medium' | 'high';
  metadata?: any;
  actionRequired?: boolean;
}

export interface TeacherQuickAction {
  id: string;
  type:
    | 'grade_assignments'
    | 'review_submissions'
    | 'contact_struggling_students'
    | 'update_course_content'
    | 'schedule_live_session'
    | 'boost_engagement'
    | 'review_deadlines'
    | 'respond_to_questions';
  title: string;
  description: string;
  actionText: string;
  href: string;
  priority: 'high' | 'medium' | 'low';
  count?: number;
  estimatedTime?: number;
  urgent?: boolean;
  metadata?: any;
}

export interface TeachingInsight {
  id: string;
  type:
    | 'class_performance'
    | 'student_engagement'
    | 'content_effectiveness'
    | 'teaching_recommendation'
    | 'improvement_suggestion';
  title: string;
  description: string;
  insights: string[];
  recommendations: {
    action: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: string;
    implementation: string;
  }[];
  confidence: number;
  dataSource: string[];
  generatedAt: string;
  courseId?: string;
  studentSegment?: string;
}

export interface AtRiskStudent {
  studentId: string;
  studentName: string;
  email: string;
  avatar?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  lastContactDate: string | null;
  interventionHistory: {
    date: string;
    action: string;
    outcome: string;
  }[];
  riskFactors: {
    factor: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }[];
  coursesAffected: {
    courseId: string;
    courseName: string;
    progressPercentage: number;
    lastActivity: string | null;
    issueAreas: string[];
  }[];
  recommendedActions: {
    action: string;
    priority: 'immediate' | 'urgent' | 'moderate' | 'low';
    description: string;
    estimatedImpact: string;
  }[];
}

export interface GradingQueue {
  id: string;
  type: AssessmentType;
  title: string;
  courseName: string;
  courseId: string;
  studentName: string;
  studentId: string;
  submittedAt: string;
  dueDate: string | null;
  isOverdue: boolean;
  priority: 'high' | 'medium' | 'low';
  estimatedGradingTime: number;
  submissionType: 'file' | 'text' | 'quiz' | 'code';
  hasAIPreGrade?: boolean;
  aiConfidence?: number | null;
}

export interface StudentOverview {
  studentId: string;
  studentName: string;
  email: string;
  avatar?: string;
  enrolledCourses: number;
  overallProgress: number;
  averageScore: number;
  lastActivity: string;
  status: 'active' | 'inactive' | 'at_risk' | 'excelling';
  coursesData: {
    courseId: string;
    courseName: string;
    progress: number;
    score: number;
    lastAccessed: string;
  }[];
  riskFactors?: string[];
  achievements: number;
}

export interface PerformanceAnalytics {
  overview: {
    totalStudents: number;
    averageClassScore: number;
    completionRate: number;
    engagementRate: number;
    improvementRate: number;
  };
  coursePerformance: {
    courseId: string;
    courseName: string;
    enrolledStudents: number;
    completionRate: number;
    averageScore: number;
    engagementMetrics: {
      videoWatchTime: number;
      assignmentSubmissionRate: number;
      discussionParticipation: number;
      quizAttemptRate: number;
    };
    strugglingStudents: number;
    excellingStudents: number;
    contentEffectiveness: {
      lessonsWithHighDrop: string[];
      topPerformingLessons: string[];
      improvementAreas: string[];
    };
  }[];
  studentSegments: {
    segment: 'excelling' | 'on_track' | 'at_risk' | 'struggling';
    count: number;
    percentage: number;
    characteristics: string[];
    recommendedActions: string[];
  }[];
  timeAnalytics: {
    peakActivityHours: { hour: number; activityCount: number }[];
    weeklyEngagement: { week: string; engagement: number }[];
    seasonalTrends: { period: string; performance: number }[];
  };
}
