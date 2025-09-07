import { IsOptional, IsString, IsNumber, Min, Max, MaxLength, IsBoolean, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateTeacherProfileDto {
  @ApiPropertyOptional({ description: 'Teacher specializations', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specializations?: string;

  @ApiPropertyOptional({ description: 'Qualifications and certifications', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  qualifications?: string;

  @ApiPropertyOptional({ description: 'Years of experience', minimum: 0, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  yearsExperience?: number;

  @ApiPropertyOptional({ description: 'Teaching style and methodology', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  teachingStyle?: string;

  @ApiPropertyOptional({ description: 'Office hours schedule', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  officeHours?: string;

  @ApiPropertyOptional({ description: 'Teacher approval status' })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @ApiPropertyOptional({ description: 'Teacher active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Admin who approved the teacher' })
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional({ description: 'Approval date' })
  @IsOptional()
  @IsDateString()
  approvedAt?: Date;

  @ApiPropertyOptional({ description: 'Approval notes' })
  @IsOptional()
  @IsString()
  approvalNotes?: string;

  @ApiPropertyOptional({ description: 'Review notes' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @ApiPropertyOptional({ description: 'Application data' })
  @IsOptional()
  applicationData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Submission date' })
  @IsOptional()
  @IsDateString()
  submittedAt?: Date;

  @ApiPropertyOptional({ description: 'Additional info requested flag' })
  @IsOptional()
  @IsBoolean()
  additionalInfoRequested?: boolean;

  @ApiPropertyOptional({ description: 'Additional info due date' })
  @IsOptional()
  @IsDateString()
  additionalInfoDueDate?: Date;

  @ApiPropertyOptional({ description: 'Required documents list' })
  @IsOptional()
  requiredDocuments?: string[];
}
