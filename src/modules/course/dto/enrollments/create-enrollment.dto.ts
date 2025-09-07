// src/modules/enrollment/dto/create-enrollment.dto.ts
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsObject,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { EnrollmentStatus, PaymentStatus } from '@/common/enums/course.enums';

export class CreateEnrollmentDto {
  @IsString()
  studentId: string;

  @IsString()
  courseId: string;

  @IsOptional()
  @IsDateString()
  enrollmentDate?: Date;

  @IsOptional()
  @IsDateString()
  completionDate?: Date;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  progressPercentage?: number;

  @IsOptional()
  @IsDateString()
  lastAccessedAt?: Date;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  paymentAmount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['USD', 'VND'])
  paymentCurrency?: string;

  @IsOptional()
  @IsString()
  paymentTransactionId?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: Date;

  @IsOptional()
  @IsString()
  certificateUrl?: string;

  @IsOptional()
  @IsDateString()
  certificateIssuedAt?: Date;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  review?: string;

  @IsOptional()
  @IsDateString()
  reviewDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalTimeSpent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lessonsCompleted?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalLessons?: number;

  @IsOptional()
  @IsDateString()
  accessExpiresAt?: Date;

  @IsOptional()
  @IsObject()
  source?: {
    channel?: string;
    campaign?: string;
    referrer?: string;
    couponCode?: string;
  };

  @IsOptional()
  @IsObject()
  preferences?: {
    playbackSpeed?: number;
    autoPlay?: boolean;
    notifications?: boolean;
    language?: string;
  };

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
