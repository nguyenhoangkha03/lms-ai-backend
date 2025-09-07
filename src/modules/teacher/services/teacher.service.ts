import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { User } from '@/modules/user/entities/user.entity';
import { TeacherProfile } from '@/modules/user/entities/teacher-profile.entity';
import { Assessment } from '@/modules/assessment/entities/assessment.entity';
import { AssessmentAttempt } from '@/modules/assessment/entities/assessment-attempt.entity';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(TeacherProfile) private readonly teacherProfileRepository: Repository<TeacherProfile>,
    @InjectRepository(Assessment) private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentAttempt) private readonly attemptRepository: Repository<AssessmentAttempt>,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherService.name);
  }

  async getTeacherProfile(teacherId: string): Promise<TeacherProfile | null> {
    this.logger.log(`Getting teacher profile for: ${teacherId}`);

    const teacher = await this.teacherProfileRepository.findOne({
      where: { userId: teacherId },
      relations: ['user'],
    });

    return teacher;
  }

  async isTeacherApproved(teacherId: string): Promise<boolean> {
    const teacher = await this.getTeacherProfile(teacherId);
    return teacher?.isApproved || false;
  }

  async isTeacherActive(teacherId: string): Promise<boolean> {
    const teacher = await this.getTeacherProfile(teacherId);
    return teacher?.isActive || false;
  }

  async getAllSubmissions(
    teacherId: string,
    options: {
      courseId?: string;
      assignmentId?: string;
      status?: string;
      limit: number;
      offset: number;
    },
  ): Promise<{
    submissions: any[];
    pagination: { total: number; limit: number; offset: number };
  }> {
    this.logger.log(`Getting all submissions for teacher: ${teacherId}`);

    // TODO: Replace with real database queries
    // For now, using mock data similar to teacher-assignments.service.ts
    const mockSubmissions = [
      {
        id: 'sub_1',
        assignmentId: 'assign_1',
        assignmentTitle: 'Linear Regression Analysis Project',
        courseId: 'course_1',
        courseName: 'Machine Learning Fundamentals',
        student: {
          id: 'student_1',
          name: 'Nguyễn Văn An',
          email: 'nguyen.van.an@email.com',
          avatar: null,
        },
        submittedAt: '2024-03-24T18:30:00Z',
        dueDate: '2024-03-25T23:59:59Z',
        status: 'pending_review',
        isLate: false,
        attempt: 1,
        maxAttempts: 2,
        files: [
          { name: 'analysis.py', size: '15.2 KB', type: 'python' },
          { name: 'report.pdf', size: '2.8 MB', type: 'pdf' },
        ],
        textSubmission: 'I implemented linear regression from scratch...',
        currentGrade: null,
        maxScore: 100,
        gradingStatus: 'not_graded',
        aiCheck: {
          plagiarismScore: 95,
          qualityScore: 82,
          completenessScore: 88,
        },
      },
      {
        id: 'sub_2',
        assignmentId: 'assign_2',
        assignmentTitle: 'Neural Network Implementation',
        courseId: 'course_1', 
        courseName: 'Machine Learning Fundamentals',
        student: {
          id: 'student_2',
          name: 'Trần Thị Bình',
          email: 'tran.thi.binh@email.com',
          avatar: null,
        },
        submittedAt: '2024-03-22T14:20:00Z',
        dueDate: '2024-03-23T23:59:59Z',
        status: 'graded',
        isLate: false,
        attempt: 1,
        maxAttempts: 1,
        files: [
          { name: 'neural_network.py', size: '28.5 KB', type: 'python' },
          { name: 'results.png', size: '1.2 MB', type: 'image' },
        ],
        textSubmission: 'My neural network achieves 94% accuracy on the test set...',
        currentGrade: 92,
        maxScore: 100,
        gradingStatus: 'graded',
        aiCheck: {
          plagiarismScore: 98,
          qualityScore: 90,
          completenessScore: 95,
        },
      },
      {
        id: 'sub_3',
        assignmentId: 'assign_3',
        assignmentTitle: 'Data Preprocessing Assignment',
        courseId: 'course_2',
        courseName: 'Data Science Bootcamp',
        student: {
          id: 'student_3',
          name: 'Lê Minh Cường',
          email: 'le.minh.cuong@email.com',
          avatar: null,
        },
        submittedAt: '2024-03-26T02:15:00Z',
        dueDate: '2024-03-25T23:59:59Z',
        status: 'needs_revision',
        isLate: true,
        attempt: 2,
        maxAttempts: 3,
        files: [
          { name: 'preprocessing.ipynb', size: '45.8 KB', type: 'jupyter' },
        ],
        textSubmission: 'I had some issues with handling missing values...',
        currentGrade: 68,
        maxScore: 100,
        gradingStatus: 'graded',
        aiCheck: {
          plagiarismScore: 85,
          qualityScore: 65,
          completenessScore: 70,
        },
      },
      {
        id: 'sub_4',
        assignmentId: 'assign_1',
        assignmentTitle: 'Linear Regression Analysis Project',
        courseId: 'course_1',
        courseName: 'Machine Learning Fundamentals',
        student: {
          id: 'student_4',
          name: 'Phạm Thu Hương',
          email: 'pham.thu.huong@email.com',
          avatar: null,
        },
        submittedAt: '2024-03-24T21:45:00Z',
        dueDate: '2024-03-25T23:59:59Z',
        status: 'in_review',
        isLate: false,
        attempt: 1,
        maxAttempts: 2,
        files: [
          { name: 'regression_model.py', size: '12.3 KB', type: 'python' },
          { name: 'analysis_report.pdf', size: '3.1 MB', type: 'pdf' },
          { name: 'dataset.csv', size: '850 KB', type: 'csv' },
        ],
        textSubmission: 'I chose the housing dataset and implemented...',
        currentGrade: null,
        maxScore: 100,
        gradingStatus: 'in_progress',
        aiCheck: {
          plagiarismScore: 92,
          qualityScore: 78,
          completenessScore: 85,
        },
      },
    ];

    // Apply filters
    let filteredSubmissions = mockSubmissions;
    
    if (options.courseId) {
      filteredSubmissions = filteredSubmissions.filter(s => s.courseId === options.courseId);
    }
    
    if (options.assignmentId) {
      filteredSubmissions = filteredSubmissions.filter(s => s.assignmentId === options.assignmentId);
    }
    
    if (options.status) {
      filteredSubmissions = filteredSubmissions.filter(s => s.status === options.status);
    }

    const total = filteredSubmissions.length;
    const submissions = filteredSubmissions.slice(options.offset, options.offset + options.limit);

    return {
      submissions,
      pagination: {
        total,
        limit: options.limit,
        offset: options.offset,
      },
    };
  }
}