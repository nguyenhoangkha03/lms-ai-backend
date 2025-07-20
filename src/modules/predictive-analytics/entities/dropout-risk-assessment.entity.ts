import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { InterventionType, RiskLevel } from './performance-prediction.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Course } from '@/modules/course/entities/course.entity';

@Entity('dropout_risk_assessments')
@Index(['studentId', 'assessmentDate'])
@Index(['riskLevel'])
@Index(['interventionRequired'])
export class DropoutRiskAssessment extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Student user ID',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Course ID',
  })
  courseId?: string;

  @Column({
    type: 'datetime',
    comment: 'Assessment date',
  })
  assessmentDate: Date;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    comment: 'Overall dropout risk level',
  })
  riskLevel: RiskLevel;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Risk probability percentage (0-100)',
  })
  riskProbability: number;

  @Column({
    type: 'json',
    comment: 'Risk factors analysis',
  })
  riskFactors: {
    academicPerformance?: {
      score: number;
      weight: number;
      details: string[];
    };
    engagementLevel?: {
      score: number;
      weight: number;
      details: string[];
    };
    attendancePattern?: {
      score: number;
      weight: number;
      details: string[];
    };
    timeManagement?: {
      score: number;
      weight: number;
      details: string[];
    };
    socialIntegration?: {
      score: number;
      weight: number;
      details: string[];
    };
    technicalIssues?: {
      score: number;
      weight: number;
      details: string[];
    };
    personalFactors?: {
      score: number;
      weight: number;
      details: string[];
    };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Protective factors',
  })
  protectiveFactors?: {
    strongMotivation?: boolean;
    goodSupport?: boolean;
    priorSuccess?: boolean;
    effectiveStudyHabits?: boolean;
    technicalCompetence?: boolean;
    timeAvailability?: boolean;
  };

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether immediate intervention is required',
  })
  interventionRequired: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Recommended intervention types',
  })
  recommendedInterventions?: InterventionType[];

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Specific intervention recommendations',
  })
  interventionRecommendations?: string;

  @Column({
    type: 'int',
    comment: 'Priority level for intervention (1-10)',
  })
  interventionPriority: number;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Recommended intervention timeline',
  })
  interventionDeadline?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trend analysis data',
  })
  trendAnalysis?: {
    direction: 'improving' | 'stable' | 'declining';
    velocity: number;
    projectedRiskIn30Days: number;
    keyInfluencers: string[];
  };

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether student has been notified',
  })
  studentNotified: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether instructor has been notified',
  })
  instructorNotified: boolean;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Next assessment date',
  })
  nextAssessmentDate?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional assessment metadata',
  })
  metadata?: Record<string, any>;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course?: Course;
}
