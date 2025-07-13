import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Grade } from '../entities/grade.entity';
import { Assessment } from '../../assessment/entities/assessment.entity';
import { Course } from '../../course/entities/course.entity';
import { UserType } from '@/common/enums/user.enums';

@Injectable()
export class GradingAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.userType === UserType.ADMIN) {
      return true;
    }

    const gradeId = request.params.id;
    const assessmentId = request.params.assessmentId;
    const courseId = request.params.courseId;

    if (gradeId) {
      return this.checkGradeAccess(gradeId, user);
    }

    if (assessmentId) {
      return this.checkAssessmentAccess(assessmentId, user);
    }

    if (courseId) {
      return this.checkCourseAccess(courseId, user);
    }

    return true;
  }

  private async checkGradeAccess(gradeId: string, user: any): Promise<boolean> {
    const grade = await this.gradeRepository.findOne({
      where: { id: gradeId },
      relations: ['assessment', 'assessment.course'],
    });

    if (!grade) {
      throw new ForbiddenException('Grade not found');
    }

    if (user.userType === UserType.STUDENT) {
      return grade.studentId === user.id;
    }

    const assessment = await grade.assessment;
    const course = await assessment.course;

    if (user.userType === UserType.TEACHER) {
      return course?.teacherId === user.id;
    }

    return false;
  }

  private async checkAssessmentAccess(assessmentId: string, user: any): Promise<boolean> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id: assessmentId },
      relations: ['course'],
    });

    if (!assessment) {
      throw new ForbiddenException('Assessment not found');
    }

    const course = await assessment.course;

    if (user.userType === UserType.TEACHER) {
      return course?.teacherId === user.id;
    }

    return false;
  }

  private async checkCourseAccess(courseId: string, user: any): Promise<boolean> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new ForbiddenException('Course not found');
    }

    if (user.userType === UserType.TEACHER) {
      return course.teacherId === user.id;
    }

    return false;
  }
}
