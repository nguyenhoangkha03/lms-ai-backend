import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DataProtectionRequest,
  RequestType,
  RequestStatus,
} from '../entities/data-protection-request.entity';
import { CreateDataProtectionRequestDto } from '../dto/create-data-protection-request.dto';
import { UpdateDataProtectionRequestDto } from '../dto/update-data-protection-request.dto';
import { DataProtectionRequestQueryDto } from '../dto/data-protection-query.dto';
import { WinstonService } from '@/logger/winston.service';
import { ComplianceAuditService } from './compliance-audit.service';
import { DataExportService } from './data-export.service';
import { DataDeletionService } from './data-deletion.service';
import { ComplianceStatus } from '../entities/compliance-audit-trail.entity';
import { DeliveryMethod, ExportFormat } from '../dto/data-export-request.dto';

@Injectable()
export class DataProtectionRequestService {
  constructor(
    @InjectRepository(DataProtectionRequest)
    private requestRepository: Repository<DataProtectionRequest>,
    private winstonLogger: WinstonService,
    private complianceAudit: ComplianceAuditService,
    private dataExport: DataExportService,
    private dataDeletion: DataDeletionService,
  ) {
    this.winstonLogger.setContext(DataProtectionRequestService.name);
  }

  async create(
    userId: string,
    createDto: CreateDataProtectionRequestDto,
    requestingUserId?: string,
  ): Promise<DataProtectionRequest> {
    try {
      const dueDate = createDto.dueDate
        ? new Date(createDto.dueDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const request = this.requestRepository.create({
        ...createDto,
        userId,
        dueDate,
        createdBy: requestingUserId || userId,
        processingLog: [
          {
            action: 'request_created',
            performedBy: requestingUserId || userId,
            timestamp: new Date(),
            details: `${createDto.type} request created`,
          },
        ],
      });

      const savedRequest = await this.requestRepository.save(request);

      await this.complianceAudit.logEvent({
        eventType: 'data_protection_request_created',
        subjectUserId: userId,
        performedBy: requestingUserId || userId,
        description: `Data protection request created: ${createDto.type}`,
        eventData: {
          requestId: savedRequest.id,
          type: createDto.type,
          description: createDto.description,
        },
        complianceStatus: ComplianceStatus.COMPLIANT,
        applicableRegulations: [
          {
            name: 'GDPR',
            article: this.getGdprArticle(createDto.type),
            requirement: 'Data subject rights',
            status: ComplianceStatus.COMPLIANT,
          },
        ],
      });

      this.winstonLogger.log(`Data protection request created: ${savedRequest.id}, {
        userId: ${userId},
        requestType: ${createDto.type},
        requestId: ${savedRequest.id},
      }`);

      return savedRequest;
    } catch (error) {
      this.winstonLogger.error(`Failed to create data protection request, {
        error: ${error},
        userId: ${userId},
        createDto: ${createDto},
      }`);
      throw error;
    }
  }

  async findAll(query: DataProtectionRequestQueryDto): Promise<{
    items: DataProtectionRequest[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, search, startDate, endDate, ...filters } = query;

    const queryBuilder = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .orderBy('request.createdAt', 'DESC');

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryBuilder.andWhere(`request.${key} = :${key}`, { [key]: value });
      }
    });

    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.andWhere('request.createdAt BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        });
      } else if (startDate) {
        queryBuilder.andWhere('request.createdAt >= :startDate', {
          startDate: new Date(startDate),
        });
      } else if (endDate) {
        queryBuilder.andWhere('request.createdAt <= :endDate', {
          endDate: new Date(endDate),
        });
      }
    }

    if (search) {
      queryBuilder.andWhere(
        '(request.description LIKE :search OR request.processingNotes LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await queryBuilder.getCount();
    const items = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<DataProtectionRequest> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!request) {
      throw new NotFoundException('Data protection request not found');
    }

    return request;
  }

  async update(
    id: string,
    updateDto: UpdateDataProtectionRequestDto,
    updatedBy: string,
  ): Promise<DataProtectionRequest> {
    const request = await this.findOne(id);

    const previousStatus = request.status;
    const updatedRequest = Object.assign(request, {
      ...updateDto,
      updatedBy,
      processingLog: [
        ...(request.processingLog || []),
        {
          action: 'request_updated',
          performedBy: updatedBy,
          timestamp: new Date(),
          details: `Status changed from ${previousStatus} to ${updateDto.status || previousStatus}`,
          result: updateDto.status === RequestStatus.COMPLETED ? 'success' : 'in_progress',
        },
      ],
    });

    if (updateDto.status === RequestStatus.COMPLETED) {
      updatedRequest.completedAt = new Date();
    }

    const savedRequest = await this.requestRepository.save(updatedRequest);

    await this.complianceAudit.logEvent({
      eventType: 'data_protection_request_updated',
      subjectUserId: request.userId,
      performedBy: updatedBy,
      description: `Data protection request updated: ${request.type}`,
      eventData: {
        before: { status: previousStatus },
        after: { status: updateDto.status },
        requestId: id,
      },
    });

    return savedRequest;
  }

  async processRequest(id: string, processedBy: string): Promise<DataProtectionRequest> {
    const request = await this.findOne(id);

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Request is not in pending status');
    }

    try {
      let result: any;

      switch (request.type) {
        case RequestType.ACCESS:
          result = await this.dataExport.exportUserData(request.userId, {
            format: ExportFormat.JSON,
            deliveryMethod: DeliveryMethod.DOWNLOAD,
            includeMetadata: true,
          });
          break;

        case RequestType.ERASURE:
          result = await this.dataDeletion.deleteUserData(request.userId, {
            softDelete: false,
            anonymize: true,
            retainAuditLogs: true,
          });
          break;

        case RequestType.PORTABILITY:
          result = await this.dataExport.exportUserData(request.userId, {
            format: ExportFormat.JSON,
            deliveryMethod: DeliveryMethod.DOWNLOAD,
            includeMetadata: false,
            structuredFormat: true,
          });
          break;

        default:
          throw new BadRequestException(`Request type ${request.type} not yet implemented`);
      }

      return await this.update(
        id,
        {
          status: RequestStatus.COMPLETED,
          processingNotes: `Processed successfully. Result: ${JSON.stringify(result)}`,
          resultFilePath: result.filePath,
          resultFileSize: result.fileSize,
          resultFileFormat: result.format,
        },
        processedBy,
      );
    } catch (error) {
      this.winstonLogger.error(`Failed to process data protection request, {
        error: ${error},
        requestId: ${id},
      }`);

      return await this.update(
        id,
        {
          status: RequestStatus.REJECTED,
          rejectionReason: `Processing failed: ${error.message}`,
        },
        processedBy,
      );
    }
  }

  async getRequestMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalRequests: number;
    requestsByType: Record<string, number>;
    requestsByStatus: Record<string, number>;
    averageProcessingTime: number;
    complianceRate: number;
  }> {
    const queryBuilder = this.requestRepository.createQueryBuilder('request');

    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.where('request.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      } else if (startDate) {
        queryBuilder.where('request.createdAt >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.where('request.createdAt <= :endDate', { endDate });
      }
    }

    const requests = await queryBuilder.getMany();

    const totalRequests = requests.length;
    const requestsByType = requests.reduce(
      (acc, req) => {
        acc[req.type] = (acc[req.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const requestsByStatus = requests.reduce(
      (acc, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const completedRequests = requests.filter(
      req => req.status === RequestStatus.COMPLETED && req.completedAt,
    );

    const averageProcessingTime =
      completedRequests.length > 0
        ? completedRequests.reduce((sum, req) => {
            const processingTime = req.completedAt!.getTime() - req.createdAt.getTime();
            return sum + processingTime;
          }, 0) /
          completedRequests.length /
          (1000 * 60 * 60 * 24)
        : 0;

    const overdueRequests = requests.filter(
      req => req.status === RequestStatus.PENDING && req.dueDate && new Date() > req.dueDate,
    );

    const complianceRate =
      totalRequests > 0 ? ((totalRequests - overdueRequests.length) / totalRequests) * 100 : 100;

    return {
      totalRequests,
      requestsByType,
      requestsByStatus,
      averageProcessingTime,
      complianceRate,
    };
  }

  private getGdprArticle(requestType: RequestType): string {
    const articles = {
      [RequestType.ACCESS]: 'Article 15',
      [RequestType.RECTIFICATION]: 'Article 16',
      [RequestType.ERASURE]: 'Article 17',
      [RequestType.RESTRICTION]: 'Article 18',
      [RequestType.PORTABILITY]: 'Article 20',
      [RequestType.OBJECTION]: 'Article 21',
      [RequestType.WITHDRAW_CONSENT]: 'Article 7',
    };
    return articles[requestType] || 'General';
  }
}
