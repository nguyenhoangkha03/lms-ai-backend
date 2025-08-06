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
    comment: 'ID Sinh viên',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID Khóa học',
  })
  courseId?: string;

  @Column({
    type: 'datetime',
    comment: 'Thời điểm mà việc đánh giá rủi ro được thực hiện',
  })
  assessmentDate: Date;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    comment: 'Phân loại mức độ rủi ro (very_low, low, medium, high, very_high)',
  })
  riskLevel: RiskLevel;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Xác suất (tính bằng %) mà sinh viên sẽ bỏ học, theo dự đoán của AI.',
  })
  riskProbability: number;

  @Column({
    type: 'json',
    comment:
      'Trường JSON liệt kê các yếu tố tiêu cực góp phần làm tăng rủi ro (ví dụ: điểm thấp, không đăng nhập thường xuyên, thời gian học giảm).',
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
    comment:
      'Trường JSON liệt kê các yếu tố tích cực giúp giảm thiểu rủi ro (ví dụ: tương tác nhiều trên diễn đàn, hoàn thành bài tập đúng hạn).',
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
    comment:
      'Cờ (true/false) báo hiệu rằng cần có sự can thiệp ngay lập tức từ giảng viên hoặc hệ thống',
  })
  interventionRequired: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Các loại can thiệp được đề xuất',
  })
  recommendedInterventions?: InterventionType[];

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Khuyến nghị can thiệp cụ thể',
  })
  interventionRecommendations?: string;

  @Column({
    type: 'int',
    comment: 'Mức độ ưu tiên can thiệp (1-10)',
  })
  interventionPriority: number;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Dòng thời gian can thiệp được đề xuất',
  })
  interventionDeadline?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu phân tích xu hướng',
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
    comment: 'Học sinh đã được thông báo chưa',
  })
  studentNotified: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Người hướng dẫn đã được thông báo chưa',
  })
  instructorNotified: boolean;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Ngày đánh giá tiếp theo',
  })
  nextAssessmentDate?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu đánh giá bổ sung',
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
