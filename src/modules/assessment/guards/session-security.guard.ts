import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { AssessmentSession, SessionStatus } from '../entities/assessment-session.entity';
import { Assessment } from '../entities/assessment.entity';

@Injectable()
export class SessionSecurityGuard implements CanActivate {
  constructor(
    @InjectRepository(AssessmentSession)
    private readonly sessionRepository: Repository<AssessmentSession>,
    @InjectRepository(Assessment)
    private readonly _assessmentRepository: Repository<Assessment>,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(SessionSecurityGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const sessionToken = request.params.sessionToken || request.body.sessionToken;

    if (!sessionToken) {
      throw new UnauthorizedException('Session token is required');
    }

    const session = await this.sessionRepository.findOne({
      where: { sessionToken },
      relations: ['assessment'],
    });

    if (!session) {
      throw new ForbiddenException('Invalid session token');
    }

    if (session.studentId !== user.id) {
      this.logger.warn(
        `Unauthorized session access attempt by user ${user.id} for session ${session.id}`,
      );
      throw new ForbiddenException('Access denied to this session');
    }

    if (session.status === SessionStatus.TERMINATED) {
      throw new ForbiddenException('Session has been terminated');
    }

    if (session.status === SessionStatus.EXPIRED || session.isExpired) {
      throw new ForbiddenException('Session has expired');
    }

    if (session.isFlagged && session.securityViolationsCount >= 5) {
      throw new ForbiddenException('Session flagged due to security violations');
    }

    const antiCheatSettings = session.assessment?.antiCheatSettingsJson || {};

    if (antiCheatSettings.ipRestriction) {
      const clientIp = request.ip || request.connection.remoteAddress;
      const allowedIps = antiCheatSettings.allowedIpAddresses || [];

      if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
        this.logger.warn(`IP restriction violation: ${clientIp} for session ${session.id}`);
        throw new ForbiddenException('Access denied from this IP address');
      }
    }

    request.assessmentSession = session;

    return true;
  }
}
