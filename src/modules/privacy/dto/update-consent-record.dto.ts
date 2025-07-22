import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ConsentStatus } from '../entities/consent-record.entity';
import { CreateConsentRecordDto } from './create-consent-record.dto';

export class UpdateConsentRecordDto extends PartialType(CreateConsentRecordDto) {
  @IsOptional()
  @IsEnum(ConsentStatus)
  status?: ConsentStatus;

  @IsOptional()
  @IsDateString()
  consentWithdrawnAt?: string;
}
