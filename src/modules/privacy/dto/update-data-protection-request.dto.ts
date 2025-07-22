import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RequestStatus } from '../entities/data-protection-request.entity';
import { CreateDataProtectionRequestDto } from './create-data-protection-request.dto';

export class UpdateDataProtectionRequestDto extends PartialType(CreateDataProtectionRequestDto) {
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsString()
  processingNotes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  resultFilePath?: string;

  @IsOptional()
  @IsString()
  resultFileFormat?: string;

  @IsOptional()
  @IsString()
  resultFileSize?: number;
}
