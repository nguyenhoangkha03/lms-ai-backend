import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { WinstonService } from '@/logger/winston.service';
import { AuditLogService } from '@/modules/system/services/audit-log.service';
import { UserService } from '@/modules/user/services/user.service';
import { EmailService } from '@/modules/auth/services/email.service';
import { AuditAction } from '@/common/enums/system.enums';
import { UserType, UserStatus } from '@/common/enums/user.enums';

export interface TeacherApplication {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    createdAt: Date;
  };
  teacherProfile: {
    id: string;
    teacherCode: string;
    specializations: string;
    qualifications: string;
    yearsExperience: number;
    teachingStyle: string;
    subjects: string[];
    isApproved: boolean;
    isActive: boolean;
    applicationData: any;
    submittedAt: Date;
  };
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

export interface ApprovalDecisionDto {
  isApproved: boolean;
  notes?: string;
  conditions?: string[];
  nextReviewDate?: Date;
}

export interface TeacherApplicationQuery {
  status?: 'pending' | 'approved' | 'rejected' | 'under_review';
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'submittedAt' | 'reviewedAt' | 'email' | 'firstName';
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class TeacherApprovalService {
  constructor(
    private readonly logger: WinstonService,
    private readonly auditLogService: AuditLogService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
  ) {
    this.logger.setContext(TeacherApprovalService.name);
  }

  async getPendingApplications(query: TeacherApplicationQuery = {}): Promise<{
    applications: TeacherApplication[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logger.log('Fetching pending teacher applications');

    const {
      status = 'pending',
      page = 1,
      limit = 20,
      search,
      sortBy = 'submittedAt',
      sortOrder = 'DESC',
    } = query;

    // This would typically query a database with proper filtering
    // For now, we'll simulate the response structure
    const applications: TeacherApplication[] = [];
    const total = 0;
    const totalPages = Math.ceil(total / limit);

    this.logger.log(`Found ${total} pending applications`);

    return {
      applications,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getApplicationById(applicationId: string): Promise<TeacherApplication> {
    this.logger.log(`Fetching teacher application: ${applicationId}`);

    // Find teacher profile by ID
    const teacherProfile = await this.userService.getTeacherProfile(applicationId);

    if (!teacherProfile) {
      throw new NotFoundException('Teacher application not found');
    }

    const user = await this.userService.findById(teacherProfile.userId, { includeProfiles: true });

    if (!user || user.userType !== UserType.TEACHER) {
      throw new NotFoundException('Teacher user not found');
    }

    const application: TeacherApplication = {
      id: teacherProfile.id,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName!,
        lastName: user.lastName!,
        phone: user.phone,
        createdAt: user.createdAt,
      },
      teacherProfile: {
        id: teacherProfile.id,
        teacherCode: teacherProfile.teacherCode,
        specializations: teacherProfile.specializations!,
        qualifications: teacherProfile.qualifications!,
        yearsExperience: teacherProfile.yearsExperience,
        teachingStyle: teacherProfile.teachingStyle!,
        subjects: teacherProfile.subjects!,
        isApproved: teacherProfile.isApproved,
        isActive: teacherProfile.isActive,
        applicationData: teacherProfile.applicationData,
        submittedAt: teacherProfile.applicationDate || teacherProfile.createdAt,
      },
      status: this.getApplicationStatus(teacherProfile),
      reviewedBy: teacherProfile.approvedBy,
      reviewedAt: teacherProfile.approvedAt,
      reviewNotes: teacherProfile.reviewNotes,
    };

    return application;
  }

  async approveTeacher(
    applicationId: string,
    adminId: string,
    approvalDto: ApprovalDecisionDto,
  ): Promise<void> {
    this.logger.log(`Teacher approval attempt: ${applicationId} by admin: ${adminId}`);

    const application = await this.getApplicationById(applicationId);

    if (application.teacherProfile.isApproved && approvalDto.isApproved) {
      throw new BadRequestException('Teacher is already approved');
    }

    const { isApproved, notes, conditions } = approvalDto;

    try {
      // Update teacher profile
      await this.userService.updateTeacherProfile(application.userId, {
        isApproved,
        isActive: isApproved, // Activate if approved
        approvedBy: adminId,
        approvedAt: new Date(),
        approvalNotes: notes,
      });

      // Update user status if approved
      if (isApproved) {
        await this.userService.update(application.userId, {
          status: UserStatus.ACTIVE,
        });
      }

      // Send approval/rejection email
      await this.sendApprovalNotification(application, isApproved, notes);

      // Log audit
      await this.auditLogService.createAuditLog({
        userId: adminId,
        action: isApproved ? AuditAction.TEACHER_APPROVED : AuditAction.TEACHER_REJECTED,
        entityType: 'teacher_application',
        entityId: applicationId,
        metadata: {
          teacherUserId: application.userId,
          teacherEmail: application.user.email,
          notes,
          conditions,
          previousStatus: application.status,
        },
      });

      this.logger.log(
        `Teacher application ${isApproved ? 'approved' : 'rejected'}: ${applicationId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to process teacher approval: ${error.message}`);
      throw error;
    }
  }

  async requestMoreInfo(
    applicationId: string,
    adminId: string,
    requestDto: {
      message: string;
      requiredDocuments?: string[];
      dueDate?: Date;
    },
  ): Promise<void> {
    this.logger.log(`Requesting more info for application: ${applicationId}`);

    const application = await this.getApplicationById(applicationId);

    // Update application status
    await this.userService.updateTeacherProfile(application.userId, {
      reviewNotes: requestDto.message,
      additionalInfoRequested: true,
      additionalInfoDueDate: requestDto.dueDate,
      requiredDocuments: requestDto.requiredDocuments,
    });

    // Send email notification
    await this.emailService.sendTeacherInfoRequestEmail(application.user.email, {
      firstName: application.user.firstName,
      lastName: application.user.lastName,
      message: requestDto.message,
      requiredDocuments: requestDto.requiredDocuments,
      dueDate: requestDto.dueDate,
    });

    // Log audit
    await this.auditLogService.createAuditLog({
      userId: adminId,
      action: AuditAction.TEACHER_APPLICATION_REVIEWED,
      entityType: 'teacher_application',
      entityId: applicationId,
      metadata: {
        teacherUserId: application.userId,
        requestType: 'additional_info',
        message: requestDto.message,
        requiredDocuments: requestDto.requiredDocuments,
        dueDate: requestDto.dueDate,
      },
    });
  }

  async bulkApproveTeachers(
    applicationIds: string[],
    adminId: string,
    approvalDto: ApprovalDecisionDto,
  ): Promise<{
    successful: string[];
    failed: { id: string; error: string }[];
  }> {
    this.logger.log(`Bulk teacher approval: ${applicationIds.length} applications`);

    const successful: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const applicationId of applicationIds) {
      try {
        await this.approveTeacher(applicationId, adminId, approvalDto);
        successful.push(applicationId);
      } catch (error) {
        failed.push({
          id: applicationId,
          error: error.message,
        });
      }
    }

    this.logger.log(
      `Bulk approval completed: ${successful.length} successful, ${failed.length} failed`,
    );

    return { successful, failed };
  }

  async getApprovalStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    underReview: number;
    total: number;
    recentApprovals: number;
    averageProcessingTime: number;
  }> {
    // This would typically query the database for statistics
    // For now, return placeholder data
    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      underReview: 0,
      total: 0,
      recentApprovals: 0,
      averageProcessingTime: 0,
    };

    this.logger.log('Retrieved approval statistics');
    return stats;
  }

  private getApplicationStatus(
    teacherProfile: any,
  ): 'pending' | 'approved' | 'rejected' | 'under_review' {
    if (teacherProfile.isApproved) {
      return 'approved';
    }

    if (teacherProfile.approvedAt && !teacherProfile.isApproved) {
      return 'rejected';
    }

    if (teacherProfile.additionalInfoRequested) {
      return 'under_review';
    }

    return 'pending';
  }

  private async sendApprovalNotification(
    application: TeacherApplication,
    isApproved: boolean,
    notes?: string,
  ): Promise<void> {
    try {
      if (isApproved) {
        await this.emailService.sendTeacherApprovalEmail(application.user.email, {
          firstName: application.user.firstName,
          lastName: application.user.lastName,
          teacherCode: application.teacherProfile.teacherCode,
          approvalNotes: notes,
        });
      } else {
        await this.emailService.sendTeacherRejectionEmail(application.user.email, {
          firstName: application.user.firstName,
          lastName: application.user.lastName,
          rejectionReason: notes,
        });
      }

      this.logger.log(
        `Sent ${isApproved ? 'approval' : 'rejection'} email to ${application.user.email}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send approval notification: ${error.message}`);
      // Don't throw error as the approval itself was successful
    }
  }
}
