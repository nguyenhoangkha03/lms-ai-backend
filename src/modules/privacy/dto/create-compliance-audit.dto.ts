import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { AuditEventType, ComplianceStatus } from '../entities/compliance-audit-trail.entity';

export class CreateComplianceAuditDto {
  @ApiProperty({ enum: AuditEventType })
  @IsEnum(AuditEventType)
  eventType: AuditEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectUserId?: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  eventData?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    changes?: Record<string, any>;
    context?: Record<string, any>;
  };

  @ApiPropertyOptional({ enum: ComplianceStatus })
  @IsOptional()
  @IsEnum(ComplianceStatus)
  complianceStatus?: ComplianceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  applicableRegulations?: Array<{
    name: string;
    article?: string;
    requirement: string;
    status: ComplianceStatus;
  }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  riskLevel?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  riskFactors?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  riskMitigation?: string;
}
