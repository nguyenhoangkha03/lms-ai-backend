import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { Assessment } from '@/modules/assessment/entities/assessment.entity';
import { AssessmentAttempt } from '@/modules/assessment/entities/assessment-attempt.entity';

@Injectable()
export class TeacherAssignmentsService {
  constructor(
    @InjectRepository(Assessment)
    private assignmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentAttempt)
    private submissionRepository: Repository<AssessmentAttempt>,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherAssignmentsService.name);
  }

  async getAssignments(
    teacherId: string,
    options: {
      courseId?: string;
      status?: string;
      limit: number;
      offset: number;
    },
  ): Promise<{
    assignments: any[];
    pagination: { total: number; limit: number; offset: number };
  }> {
    this.logger.log(`Getting assignments for teacher: ${teacherId}`);

    // Mock data - replace with actual database queries
    const mockAssignments = [
      {
        id: '1',
        title: 'Machine Learning Project',
        description: 'Build and train a neural network model',
        courseId: '1',
        courseName: 'Machine Learning Fundamentals',
        dueDate: '2024-04-15T23:59:59Z',
        maxScore: 100,
        submissionType: 'file',
        status: 'active',
        totalSubmissions: 45,
        gradedSubmissions: 32,
        pendingSubmissions: 13,
        averageScore: 85.5,
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-20T14:30:00Z',
      },
      {
        id: '2',
        title: 'Data Visualization Assignment',
        description: 'Create interactive charts using Python libraries',
        courseId: '2',
        courseName: 'Advanced Python Programming',
        dueDate: '2024-04-20T23:59:59Z',
        maxScore: 80,
        submissionType: 'both',
        status: 'active',
        totalSubmissions: 28,
        gradedSubmissions: 28,
        pendingSubmissions: 0,
        averageScore: 78.2,
        createdAt: '2024-03-10T09:00:00Z',
        updatedAt: '2024-04-01T16:45:00Z',
      },
      {
        id: '3',
        title: 'Final Project Proposal',
        description: 'Submit your final project proposal with timeline',
        courseId: '1',
        courseName: 'Machine Learning Fundamentals',
        dueDate: '2024-05-01T23:59:59Z',
        maxScore: 50,
        submissionType: 'text',
        status: 'draft',
        totalSubmissions: 0,
        gradedSubmissions: 0,
        pendingSubmissions: 0,
        averageScore: 0,
        createdAt: '2024-04-01T08:00:00Z',
        updatedAt: '2024-04-01T08:00:00Z',
      },
    ];

    // Apply filters
    let filteredAssignments = mockAssignments;

    if (options.courseId) {
      filteredAssignments = filteredAssignments.filter(a => a.courseId === options.courseId);
    }

    if (options.status) {
      filteredAssignments = filteredAssignments.filter(a => a.status === options.status);
    }

    const total = filteredAssignments.length;
    const assignments = filteredAssignments.slice(options.offset, options.offset + options.limit);

    return {
      assignments,
      pagination: {
        total,
        limit: options.limit,
        offset: options.offset,
      },
    };
  }

  async getAssignmentById(teacherId: string, assignmentId: string): Promise<any> {
    this.logger.log(`Getting assignment ${assignmentId} for teacher: ${teacherId}`);

    // Mock data
    return {
      id: assignmentId,
      title: 'Machine Learning Project',
      description: 'Build and train a neural network model for image classification',
      instructions: `
        1. Choose a dataset from the provided list
        2. Implement data preprocessing pipeline
        3. Design and train a neural network
        4. Evaluate model performance
        5. Submit code and report
      `,
      courseId: '1',
      courseName: 'Machine Learning Fundamentals',
      dueDate: '2024-04-15T23:59:59Z',
      maxScore: 100,
      submissionType: 'file',
      allowLateSubmissions: true,
      lateSubmissionPenalty: 10,
      status: 'active',
      resources: ['Dataset Links.pdf', 'Project Guidelines.docx', 'Evaluation Rubric.pdf'],
      rubric: [
        {
          id: '1',
          criterion: 'Code Quality',
          maxScore: 30,
          description: 'Clean, well-documented code',
        },
        {
          id: '2',
          criterion: 'Model Performance',
          maxScore: 40,
          description: 'Accuracy and evaluation metrics',
        },
        {
          id: '3',
          criterion: 'Report Quality',
          maxScore: 30,
          description: 'Clear analysis and conclusions',
        },
      ],
      totalSubmissions: 45,
      gradedSubmissions: 32,
      pendingSubmissions: 13,
      averageScore: 85.5,
      createdAt: '2024-03-15T10:00:00Z',
      updatedAt: '2024-03-20T14:30:00Z',
    };
  }

  async createAssignment(teacherId: string, assignmentData: any): Promise<any> {
    this.logger.log(`Creating assignment for teacher: ${teacherId}`);

    // Mock response
    return {
      id: `assignment-${Date.now()}`,
      ...assignmentData,
      teacherId,
      status: 'draft',
      totalSubmissions: 0,
      gradedSubmissions: 0,
      pendingSubmissions: 0,
      averageScore: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async updateAssignment(teacherId: string, assignmentId: string, updateData: any): Promise<any> {
    this.logger.log(`Updating assignment ${assignmentId} for teacher: ${teacherId}`);

    // Mock response
    return {
      id: assignmentId,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
  }

  async deleteAssignment(teacherId: string, assignmentId: string): Promise<void> {
    this.logger.log(`Deleting assignment ${assignmentId} for teacher: ${teacherId}`);
    // Mock deletion - no return needed
  }

  async getAssignmentSubmissions(
    teacherId: string,
    assignmentId: string,
    status?: string,
  ): Promise<any[]> {
    this.logger.log(`Getting submissions for assignment ${assignmentId}, teacher: ${teacherId}`);

    // Mock submissions data
    const mockSubmissions = [
      {
        id: '1',
        assignmentId,
        studentId: 'student-1',
        studentName: 'Nguyễn Văn An',
        studentEmail: 'nguyen.van.an@email.com',
        submittedAt: '2024-04-14T20:30:00Z',
        status: 'submitted',
        score: null,
        feedback: null,
        isLate: false,
        submissionType: 'file',
        files: [
          {
            id: '1',
            fileName: 'ml_project.zip',
            fileSize: 2048000,
            uploadedAt: '2024-04-14T20:30:00Z',
          },
        ],
        textSubmission: null,
        gradeHistory: [],
      },
      {
        id: '2',
        assignmentId,
        studentId: 'student-2',
        studentName: 'Trần Thị Bình',
        studentEmail: 'tran.thi.binh@email.com',
        submittedAt: '2024-04-13T18:15:00Z',
        status: 'graded',
        score: 92,
        feedback: 'Excellent work! Great model architecture and thorough analysis.',
        isLate: false,
        submissionType: 'file',
        files: [
          {
            id: '2',
            fileName: 'neural_network_project.zip',
            fileSize: 1536000,
            uploadedAt: '2024-04-13T18:15:00Z',
          },
        ],
        textSubmission: null,
        rubricScores: [
          { criterionId: '1', score: 28 },
          { criterionId: '2', score: 38 },
          { criterionId: '3', score: 26 },
        ],
        gradeHistory: [
          {
            gradedAt: '2024-04-15T10:00:00Z',
            gradedBy: teacherId,
            score: 92,
            feedback: 'Excellent work! Great model architecture and thorough analysis.',
          },
        ],
      },
      {
        id: '3',
        assignmentId,
        studentId: 'student-3',
        studentName: 'Lê Minh Cường',
        studentEmail: 'le.minh.cuong@email.com',
        submittedAt: '2024-04-16T08:45:00Z',
        status: 'submitted',
        score: null,
        feedback: null,
        isLate: true,
        submissionType: 'file',
        files: [
          {
            id: '3',
            fileName: 'late_submission.zip',
            fileSize: 1792000,
            uploadedAt: '2024-04-16T08:45:00Z',
          },
        ],
        textSubmission: null,
        gradeHistory: [],
      },
    ];

    // Apply status filter if provided
    if (status) {
      return mockSubmissions.filter(s => s.status === status);
    }

    return mockSubmissions;
  }

  async gradeSubmission(
    teacherId: string,
    assignmentId: string,
    submissionId: string,
    gradeData: {
      score: number;
      feedback: string;
      rubricScores?: { criterionId: string; score: number }[];
    },
  ): Promise<any> {
    this.logger.log(
      `Grading submission ${submissionId} for assignment ${assignmentId}, teacher: ${teacherId}`,
    );

    // Mock graded submission
    return {
      id: submissionId,
      assignmentId,
      status: 'graded',
      score: gradeData.score,
      feedback: gradeData.feedback,
      rubricScores: gradeData.rubricScores || [],
      gradedAt: new Date().toISOString(),
      gradedBy: teacherId,
    };
  }

  async bulkGradeSubmissions(
    teacherId: string,
    assignmentId: string,
    submissions: {
      submissionId: string;
      score: number;
      feedback: string;
    }[],
  ): Promise<{ gradedCount: number }> {
    this.logger.log(
      `Bulk grading ${submissions.length} submissions for assignment ${assignmentId}, teacher: ${teacherId}`,
    );

    // Mock bulk grading
    return {
      gradedCount: submissions.length,
    };
  }

  async getAssignmentStatistics(teacherId: string): Promise<any> {
    this.logger.log(`Getting assignment statistics for teacher: ${teacherId}`);

    // Mock statistics
    return {
      totalAssignments: 12,
      activeAssignments: 8,
      draftAssignments: 3,
      completedAssignments: 1,
      totalSubmissions: 156,
      pendingGrading: 23,
      gradedSubmissions: 133,
      averageGradingTime: 45, // minutes
      averageScore: 82.3,
      submissionTrends: [
        { date: '2024-03-01', submissions: 12 },
        { date: '2024-03-08', submissions: 18 },
        { date: '2024-03-15', submissions: 25 },
        { date: '2024-03-22', submissions: 31 },
        { date: '2024-03-29', submissions: 28 },
      ],
      gradingWorkload: [
        { courseId: '1', courseName: 'Machine Learning Fundamentals', pendingCount: 15 },
        { courseId: '2', courseName: 'Advanced Python Programming', pendingCount: 8 },
      ],
    };
  }
}
