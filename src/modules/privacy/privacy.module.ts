import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { DataProtectionRequest } from './entities/data-protection-request.entity';
import { ConsentRecord } from './entities/consent-record.entity';
import { DataAnonymizationLog } from './entities/data-anonymization-log.entity';
import { PrivacySettings } from './entities/privacy-settings.entity';
import { ComplianceAuditTrail } from './entities/compliance-audit-trail.entity';

// Services
import { DataProtectionRequestService } from './services/data-protection-request.service';
import { ConsentManagementService } from './services/consent-management.service';
import { DataAnonymizationService } from './services/data-anonymization.service';
import { DataExportService } from './services/data-export.service';
import { DataDeletionService } from './services/data-deletion.service';
import { PrivacySettingsService } from './services/privacy-settings.service';
import { ComplianceAuditService } from './services/compliance-audit.service';

// Controllers
import { DataProtectionRequestController } from './controllers/data-protection-request.controller';
import { ConsentManagementController } from './controllers/consent-management.controller';
import { PrivacySettingsController } from './controllers/privacy-settings.controller';
import { DataExportController } from './controllers/data-export.controller';
import { DataAnonymizationController } from './controllers/data-anonymization.controller';
import { ComplianceAuditController } from './controllers/compliance-audit.controller';
import { DataDeletionController } from './controllers/data-deletion.controller';
import { GdprComplianceController } from './controllers/gdpr-compliance.controller';

// External modules
import { WinstonModule } from '@/logger/winston.module';
import { RedisModule } from '@/redis/redis.module';
import { AuthModule } from '@/modules/auth/auth.module';

// Scheduled services
import { PrivacyCleanupService } from './scheduled/privacy-cleanup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DataProtectionRequest,
      ConsentRecord,
      DataAnonymizationLog,
      PrivacySettings,
      ComplianceAuditTrail,
    ]),
    ConfigModule,
    WinstonModule,
    RedisModule,
    AuthModule,
  ],
  providers: [
    DataProtectionRequestService,
    ConsentManagementService,
    DataAnonymizationService,
    DataExportService,
    DataDeletionService,
    PrivacySettingsService,
    ComplianceAuditService,
    PrivacyCleanupService,
  ],
  controllers: [
    DataProtectionRequestController,
    ConsentManagementController,
    PrivacySettingsController,
    DataExportController,
    DataAnonymizationController,
    ComplianceAuditController,
    DataDeletionController,
    GdprComplianceController,
  ],
  exports: [
    DataProtectionRequestService,
    ConsentManagementService,
    DataAnonymizationService,
    DataExportService,
    DataDeletionService,
    PrivacySettingsService,
    ComplianceAuditService,
  ],
})
export class PrivacyModule {}
