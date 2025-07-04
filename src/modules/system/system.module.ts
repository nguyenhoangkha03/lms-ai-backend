import { Module } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemController } from './controllers/system.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from './entities/system-setting.entity';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogService } from './services/audit-log.service';
import { CustomCacheModule } from '@/cache/cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting, AuditLog]), CustomCacheModule],
  controllers: [SystemController],
  providers: [SystemService, AuditLogService],
  exports: [TypeOrmModule, AuditLogService],
})
export class SystemModule {}
