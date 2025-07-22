import { DataExportRequestDto, ExportFormat, DeliveryMethod } from '../dto/data-export-request.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ComplianceAuditService } from './compliance-audit.service';
import { WinstonService } from '@/logger/winston.service';
import { ConfigService } from '@nestjs/config';
import { ComplianceStatus } from '../entities/compliance-audit-trail.entity';

@Injectable()
export class DataExportService {
  private readonly exportPath: string;

  constructor(
    private winstonLogger: WinstonService,
    private complianceAudit: ComplianceAuditService,
    private configService: ConfigService,
  ) {
    this.winstonLogger.setContext(DataExportService.name);
    this.exportPath = this.configService.get<string>('storage.exportPath', './exports');
  }

  async exportUserData(
    userId: string,
    exportRequest: DataExportRequestDto,
    requestedBy?: string,
  ): Promise<{
    filePath: string;
    fileSize: number;
    format: string;
    downloadUrl?: string;
  }> {
    try {
      const userData = await this.collectUserData(userId, exportRequest.dataCategories);

      if (exportRequest.anonymizeData) {
        await this.anonymizeExportData(userData);
      }

      const exportFile = await this.generateExportFile(
        userData,
        exportRequest.format,
        userId,
        exportRequest.includeMetadata,
      );

      let downloadUrl: string | undefined;
      if (exportRequest.deliveryMethod === DeliveryMethod.SECURE_LINK) {
        downloadUrl = await this.generateSecureDownloadLink(exportFile.filePath);
      }
      await this.complianceAudit.logEvent({
        eventType: 'data_export',
        subjectUserId: userId,
        performedBy: requestedBy || userId,
        description: 'User data exported',
        eventData: {
          format: exportRequest.format,
          deliveryMethod: exportRequest.deliveryMethod,
          dataCategories: exportRequest.dataCategories,
          fileSize: exportFile.fileSize,
        },
        complianceStatus: ComplianceStatus.COMPLIANT,
        applicableRegulations: [
          {
            name: 'GDPR',
            article: 'Article 20',
            requirement: 'Right to data portability',
            status: ComplianceStatus.COMPLIANT,
          },
        ],
      });

      this.winstonLogger.log(`Data exported for user: ${userId}, {
        userId: ${userId},
        format: ${exportRequest.format},
        fileSize: ${exportFile.fileSize},
      }`);

      return {
        filePath: exportFile.filePath,
        fileSize: exportFile.fileSize,
        format: exportRequest.format,
        downloadUrl,
      };
    } catch (error) {
      this.winstonLogger.error(`Failed to export user data: ${error}, ${userId}, ${exportRequest}`);
      throw error;
    }
  }

  private async collectUserData(
    userId: string,
    dataCategories?: string[],
  ): Promise<Record<string, any>> {
    const userData: Record<string, any> = {};

    const categoriesToCollect = dataCategories || [
      'profile',
      'courses',
      'progress',
      'assessments',
      'communications',
      'analytics',
    ];

    for (const category of categoriesToCollect) {
      switch (category) {
        case 'profile':
          userData.profile = await this.collectProfileData(userId);
          break;
        case 'courses':
          userData.courses = await this.collectCourseData(userId);
          break;
        case 'progress':
          userData.progress = await this.collectProgressData(userId);
          break;
        case 'assessments':
          userData.assessments = await this.collectAssessmentData(userId);
          break;
        case 'communications':
          userData.communications = await this.collectCommunicationData(userId);
          break;
        case 'analytics':
          userData.analytics = await this.collectAnalyticsData(userId);
          break;
      }
    }

    return userData;
  }

  private async collectProfileData(userId: string): Promise<any> {
    return {
      user: { id: userId, email: 'user@example.com' },
      profile: { bio: 'User bio', dateOfBirth: '1990-01-01' },
      preferences: { language: 'en', timezone: 'UTC' },
    };
  }

  private async collectCourseData(_userId: string): Promise<any> {
    return {
      enrollments: [],
      completions: [],
      certificates: [],
    };
  }

  private async collectProgressData(_userId: string): Promise<any> {
    return {
      sessions: [],
      activities: [],
      streaks: [],
    };
  }

  private async collectAssessmentData(_userId: string): Promise<any> {
    return {
      attempts: [],
      results: [],
      feedback: [],
    };
  }

  private async collectCommunicationData(_userId: string): Promise<any> {
    return {
      messages: [],
      notifications: [],
      forums: [],
    };
  }

  private async collectAnalyticsData(_userId: string): Promise<any> {
    return {
      pageViews: [],
      interactions: [],
      performance: [],
    };
  }

  private async anonymizeExportData(userData: Record<string, any>): Promise<void> {
    const anonymizeString = (str: string): string => {
      if (!str) return str;
      return str.replace(/[a-zA-Z]/g, '*');
    };

    const anonymizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return anonymizeString(obj);
      } else if (typeof obj === 'object' && obj !== null) {
        const anonymized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (key === 'id' || key === 'email' || key === 'name') {
            anonymized[key] = anonymizeString(value as string);
          } else {
            anonymized[key] = anonymizeObject(value);
          }
        }
        return anonymized;
      }
      return obj;
    };

    for (const [key, value] of Object.entries(userData)) {
      userData[key] = anonymizeObject(value);
    }
  }

  private async generateExportFile(
    userData: Record<string, any>,
    format: ExportFormat,
    userId: string,
    includeMetadata: boolean = true,
  ): Promise<{ filePath: string; fileSize: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `user-data-export-${userId}-${timestamp}`;

    if (includeMetadata) {
      userData._metadata = {
        exportDate: new Date().toISOString(),
        userId,
        format,
        version: '1.0',
        regulations: ['GDPR Article 20 - Right to data portability'],
      };
    }

    let filePath: string;
    let content: string | Buffer;

    switch (format) {
      case ExportFormat.JSON:
        content = JSON.stringify(userData, null, 2);
        filePath = path.join(this.exportPath, `${fileName}.json`);
        break;

      case ExportFormat.CSV:
        content = await this.convertToCSV(userData);
        filePath = path.join(this.exportPath, `${fileName}.csv`);
        break;

      case ExportFormat.XML:
        content = await this.convertToXML(userData);
        filePath = path.join(this.exportPath, `${fileName}.xml`);
        break;

      case ExportFormat.PDF:
        content = await this.convertToPDF(userData);
        filePath = path.join(this.exportPath, `${fileName}.pdf`);
        break;

      default:
        throw new BadRequestException(`Export format ${format} not supported`);
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true });

    await fs.writeFile(filePath, content);

    const stats = await fs.stat(filePath);

    return {
      filePath,
      fileSize: stats.size,
    };
  }

  private async convertToCSV(userData: Record<string, any>): Promise<string> {
    const rows: string[] = [];

    const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
      const flattened: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(flattened, flattenObject(value, newKey));
        } else {
          flattened[newKey] = value;
        }
      }
      return flattened;
    };

    const flattened = flattenObject(userData);
    const headers = Object.keys(flattened);
    rows.push(headers.join(','));
    rows.push(
      Object.values(flattened)
        .map(v => `"${v}"`)
        .join(','),
    );

    return rows.join('\n');
  }

  private async convertToXML(userData: Record<string, any>): Promise<string> {
    const convertObjectToXML = (obj: any, rootName = 'root'): string => {
      let xml = `<${rootName}>`;

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          xml += convertObjectToXML(value, key);
        } else {
          xml += `<${key}>${value}</${key}>`;
        }
      }

      xml += `</${rootName}>`;
      return xml;
    };

    return `<?xml version="1.0" encoding="UTF-8"?>\n${convertObjectToXML(userData, 'userData')}`;
  }

  private async convertToPDF(userData: Record<string, any>): Promise<Buffer> {
    const text = JSON.stringify(userData, null, 2);
    return Buffer.from(text, 'utf-8');
  }

  private async generateSecureDownloadLink(_filePath: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const _expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return `https://api.example.com/exports/download/${token}`;
  }
}
