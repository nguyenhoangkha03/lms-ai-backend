import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsArray,
  IsDate,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PeerReviewType, PeerReviewStatus } from '@/common/enums/collaborative.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class CreatePeerReviewDto {
  @ApiProperty({ description: 'Peer review title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Peer review description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PeerReviewType, description: 'Peer review type' })
  @IsEnum(PeerReviewType)
  type: PeerReviewType;

  @ApiPropertyOptional({ description: 'Associated course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Associated assignment ID' })
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @ApiPropertyOptional({ description: 'Review due date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @ApiPropertyOptional({
    description: 'Number of reviewers per submission',
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  reviewersPerSubmission?: number;

  @ApiPropertyOptional({
    description: 'Number of submissions per reviewer',
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  submissionsPerReviewer?: number;

  @ApiPropertyOptional({ description: 'Is anonymous review' })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ description: 'Allow self review' })
  @IsOptional()
  @IsBoolean()
  allowSelfReview?: boolean;

  @ApiPropertyOptional({ description: 'Review criteria' })
  @IsOptional()
  @IsArray()
  criteria?: any[];

  @ApiPropertyOptional({ description: 'Review rubric' })
  @IsOptional()
  rubric?: any;

  @ApiPropertyOptional({ description: 'Review instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class UpdatePeerReviewDto {
  @ApiPropertyOptional({ description: 'Peer review title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Peer review description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PeerReviewStatus, description: 'Peer review status' })
  @IsOptional()
  @IsEnum(PeerReviewStatus)
  status?: PeerReviewStatus;

  @ApiPropertyOptional({ description: 'Review due date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Review criteria' })
  @IsOptional()
  @IsArray()
  criteria?: any[];

  @ApiPropertyOptional({ description: 'Review rubric' })
  @IsOptional()
  rubric?: any;

  @ApiPropertyOptional({ description: 'Review instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class SubmitPeerReviewDto {
  @ApiProperty({ description: 'Submission content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Submission attachments' })
  @IsOptional()
  @IsArray()
  attachments?: any[];
}

export class SubmitPeerFeedbackDto {
  @ApiProperty({ description: 'Review feedback content' })
  @IsString()
  feedback: string;

  @ApiPropertyOptional({ description: 'Overall score', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @ApiPropertyOptional({ description: 'Detailed scores by criteria' })
  @IsOptional()
  criteriaScores?: any;
}

export class PeerReviewQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PeerReviewType, description: 'Filter by review type' })
  @IsOptional()
  @IsEnum(PeerReviewType)
  type?: PeerReviewType;

  @ApiPropertyOptional({ enum: PeerReviewStatus, description: 'Filter by review status' })
  @IsOptional()
  @IsEnum(PeerReviewStatus)
  status?: PeerReviewStatus;

  @ApiPropertyOptional({ description: 'Filter by course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Search by title' })
  @IsOptional()
  @IsString()
  search?: string;
}
