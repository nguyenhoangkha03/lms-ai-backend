import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Grade, GradeStatus, FeedbackType } from '../../modules/grading/entities/grade.entity';
import {
  Feedback,
  FeedbackCategory,
  FeedbackSeverity,
} from '../../modules/grading/entities/feedback.entity';
import { Gradebook, GradebookStatus } from '../../modules/grading/entities/gradebook.entity';
import { GradingRubric, RubricType } from '../../modules/grading/entities/grading-rubric.entity';

import { User } from '../../modules/user/entities/user.entity';
import { Course } from '../../modules/course/entities/course.entity';
import { Assessment } from '../../modules/assessment/entities/assessment.entity';
import { AssessmentAttempt } from '../../modules/assessment/entities/assessment-attempt.entity';
import { UserType } from '@/common/enums/user.enums';

@Injectable()
export class GradingSeeder {
  private readonly logger = new Logger(GradingSeeder.name);
  constructor(
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectRepository(Gradebook)
    private readonly gradebookRepository: Repository<Gradebook>,
    @InjectRepository(GradingRubric)
    private readonly gradingRubricRepository: Repository<GradingRubric>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentAttempt)
    private readonly assessmentAttemptRepository: Repository<AssessmentAttempt>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Starting grading module seeding...');

    try {
      const teachers = await this.userRepository.find({ where: { userType: UserType.TEACHER } });
      const students = await this.userRepository.find({ where: { userType: UserType.STUDENT } });
      const courses = await this.courseRepository.find();
      const assessments = await this.assessmentRepository.find();
      const attempts = await this.assessmentAttemptRepository.find();

      if (teachers.length === 0 || students.length === 0 || courses.length === 0) {
        this.logger.warn('Required data not found. Skipping grading seeding.');
        return;
      }

      await this.seedGradingRubrics(teachers);

      await this.seedGradebooks(teachers, courses);

      if (assessments.length > 0 && attempts.length > 0) {
        await this.seedGrades(teachers, students, assessments, attempts);
      }

      this.logger.log('Grading module seeding completed successfully');
    } catch (error) {
      this.logger.error('Error seeding grading module:', error);
      throw error;
    }
  }

  private async seedGradingRubrics(teachers: User[]): Promise<void> {
    const rubricData = [
      {
        title: 'Essay Grading Rubric',
        description: 'Comprehensive rubric for essay assignments',
        type: RubricType.ANALYTIC,
        isTemplate: true,
        criteria: JSON.stringify([
          {
            id: 'content',
            name: 'Content Quality',
            description: 'Relevance, accuracy, and depth of content',
            weight: 0.4,
            maxScore: 4,
            levels: [
              { score: 4, title: 'Excellent', description: 'Comprehensive and insightful content' },
              { score: 3, title: 'Good', description: 'Solid content with good understanding' },
              { score: 2, title: 'Satisfactory', description: 'Basic content meets requirements' },
              {
                score: 1,
                title: 'Needs Improvement',
                description: 'Limited or superficial content',
              },
            ],
          },
          {
            id: 'structure',
            name: 'Organization',
            description: 'Logical flow and clear structure',
            weight: 0.25,
            maxScore: 4,
            levels: [
              { score: 4, title: 'Excellent', description: 'Clear, logical organization' },
              { score: 3, title: 'Good', description: 'Generally well organized' },
              { score: 2, title: 'Satisfactory', description: 'Basic organization present' },
              {
                score: 1,
                title: 'Needs Improvement',
                description: 'Poor or confusing organization',
              },
            ],
          },
          {
            id: 'language',
            name: 'Language & Grammar',
            description: 'Grammar, spelling, and language use',
            weight: 0.2,
            maxScore: 4,
            levels: [
              { score: 4, title: 'Excellent', description: 'Excellent grammar and language use' },
              { score: 3, title: 'Good', description: 'Minor grammar errors' },
              {
                score: 2,
                title: 'Satisfactory',
                description: 'Some grammar issues but understandable',
              },
              { score: 1, title: 'Needs Improvement', description: 'Frequent grammar errors' },
            ],
          },
          {
            id: 'critical_thinking',
            name: 'Critical Thinking',
            description: 'Analysis, evaluation, and original thought',
            weight: 0.15,
            maxScore: 4,
            levels: [
              {
                score: 4,
                title: 'Excellent',
                description: 'Strong critical analysis and original insights',
              },
              { score: 3, title: 'Good', description: 'Good analysis with some original thought' },
              { score: 2, title: 'Satisfactory', description: 'Basic analysis present' },
              {
                score: 1,
                title: 'Needs Improvement',
                description: 'Limited analysis or critical thinking',
              },
            ],
          },
        ]),
        maxScore: 100,
      },
      {
        title: 'Programming Assignment Rubric',
        description: 'Rubric for coding assignments',
        type: RubricType.ANALYTIC,
        isTemplate: true,
        criteria: JSON.stringify([
          {
            id: 'functionality',
            name: 'Functionality',
            description: 'Does the code work correctly?',
            weight: 0.4,
            maxScore: 10,
            levels: [
              { score: 10, title: 'Perfect', description: 'All features work correctly' },
              { score: 8, title: 'Good', description: 'Most features work with minor issues' },
              { score: 6, title: 'Satisfactory', description: 'Basic functionality present' },
              { score: 4, title: 'Needs Work', description: 'Major functionality issues' },
              { score: 2, title: 'Poor', description: 'Minimal functionality' },
            ],
          },
          {
            id: 'code_quality',
            name: 'Code Quality',
            description: 'Code organization, naming, and best practices',
            weight: 0.3,
            maxScore: 10,
            levels: [
              { score: 10, title: 'Excellent', description: 'Clean, well-organized code' },
              { score: 8, title: 'Good', description: 'Generally good code structure' },
              { score: 6, title: 'Satisfactory', description: 'Basic code organization' },
              { score: 4, title: 'Needs Work', description: 'Poor code structure' },
              { score: 2, title: 'Poor', description: 'Very poor code quality' },
            ],
          },
          {
            id: 'documentation',
            name: 'Documentation',
            description: 'Comments and documentation quality',
            weight: 0.2,
            maxScore: 10,
            levels: [
              { score: 10, title: 'Excellent', description: 'Comprehensive documentation' },
              { score: 8, title: 'Good', description: 'Good documentation coverage' },
              { score: 6, title: 'Satisfactory', description: 'Basic documentation present' },
              { score: 4, title: 'Needs Work', description: 'Limited documentation' },
              { score: 2, title: 'Poor', description: 'Little to no documentation' },
            ],
          },
          {
            id: 'testing',
            name: 'Testing',
            description: 'Test cases and error handling',
            weight: 0.1,
            maxScore: 10,
            levels: [
              { score: 10, title: 'Excellent', description: 'Comprehensive testing' },
              { score: 8, title: 'Good', description: 'Good test coverage' },
              { score: 6, title: 'Satisfactory', description: 'Basic testing present' },
              { score: 4, title: 'Needs Work', description: 'Limited testing' },
              { score: 2, title: 'Poor', description: 'No testing' },
            ],
          },
        ]),
        maxScore: 100,
      },
    ];

    for (const rubricInfo of rubricData) {
      const existing = await this.gradingRubricRepository.findOne({
        where: { title: rubricInfo.title },
      });

      if (!existing) {
        const rubric = this.gradingRubricRepository.create({
          ...rubricInfo,
          createdBy: teachers[0].id,
          updatedBy: teachers[0].id,
        });

        await this.gradingRubricRepository.save(rubric);
        this.logger.log(`Created grading rubric: ${rubricInfo.title}`);
      }
    }
  }

  private async seedGradebooks(teachers: User[], courses: Course[]): Promise<void> {
    for (const course of courses) {
      const teacher = teachers.find(t => t.id === course.teacherId) || teachers[0];

      const existing = await this.gradebookRepository.findOne({
        where: { courseId: course.id },
      });

      if (!existing) {
        const gradebook = this.gradebookRepository.create({
          courseId: course.id,
          teacherId: teacher.id,
          name: `${course.title} - Gradebook`,
          description: `Official gradebook for ${course.title}`,
          status: GradebookStatus.ACTIVE,
          gradingScale: JSON.stringify({
            A: { min: 90 },
            B: { min: 80 },
            C: { min: 70 },
            D: { min: 60 },
            F: { min: 0 },
          }),
          weightingScheme: JSON.stringify({
            quiz: 0.3,
            assignment: 0.4,
            exam: 0.3,
          }),
          passingThreshold: 60,
          allowLateSubmissions: true,
          latePenaltyPercentage: 10,
          createdBy: teacher.id,
          updatedBy: teacher.id,
        });

        await this.gradebookRepository.save(gradebook);
        this.logger.log(`Created gradebook for course: ${course.title}`);
      }
    }
  }

  private async seedGrades(
    teachers: User[],
    students: User[],
    assessments: Assessment[],
    attempts: AssessmentAttempt[],
  ): Promise<void> {
    const sampleGrades: Grade[] = [];

    for (let i = 0; i < Math.min(20, attempts.length); i++) {
      const attempt = attempts[i];
      const assessment = assessments.find(a => a.id === attempt.assessmentId);
      const student = students.find(s => s.id === attempt.studentId);
      const teacher = teachers.find(t => t.id === assessment?.createdBy) || teachers[0];

      if (!assessment || !student || !teacher) continue;

      const existingGrade = await this.gradeRepository.findOne({
        where: {
          studentId: student.id,
          assessmentId: assessment.id,
          attemptId: attempt.id,
        },
      });

      if (existingGrade) continue;

      const maxScore = 100;
      const score = Math.floor(Math.random() * 40) + 60;
      const percentage = (score / maxScore) * 100;
      const isAiGraded = Math.random() > 0.5;

      const grade = this.gradeRepository.create({
        studentId: student.id,
        assessmentId: assessment.id,
        attemptId: attempt.id,
        graderId: teacher.id,
        score,
        maxScore,
        percentage,
        status: GradeStatus.GRADED,
        feedbackType: isAiGraded ? FeedbackType.AI_GENERATED : FeedbackType.MANUAL,
        overallFeedback: this.generateSampleFeedback(percentage),
        isPublished: Math.random() > 0.3, // 70% published
        publishedAt: Math.random() > 0.3 ? new Date() : null,
        isAiGraded,
        aiConfidence: isAiGraded ? Math.random() * 0.3 + 0.7 : null, // 0.7-1.0
        gradedAt: new Date(),
        createdBy: teacher.id,
        updatedBy: teacher.id,
      } as Grade);

      sampleGrades.push(grade);
    }

    if (sampleGrades.length > 0) {
      await this.gradeRepository.save(sampleGrades);
      this.logger.log(`Created ${sampleGrades.length} sample grades`);

      await this.seedFeedback(sampleGrades, teachers);
    }
  }

  private async seedFeedback(grades: Grade[], teachers: User[]): Promise<void> {
    const sampleFeedbacks: Feedback[] = [];

    for (const grade of grades.slice(0, 10)) {
      const teacher = teachers.find(t => t.id === grade.graderId) || teachers[0];

      const feedbackCount = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < feedbackCount; i++) {
        const categories = Object.values(FeedbackCategory);
        const severities = Object.values(FeedbackSeverity);

        const feedback = this.feedbackRepository.create({
          gradeId: grade.id,
          authorId: teacher.id,
          category: categories[Math.floor(Math.random() * categories.length)],
          severity: severities[Math.floor(Math.random() * severities.length)],
          content: this.generateSampleFeedbackContent(),
          suggestion: Math.random() > 0.5 ? this.generateSampleSuggestion() : null,
          isAiGenerated: grade.isAiGraded,
          aiConfidence: grade.isAiGraded ? Math.random() * 0.3 + 0.7 : null,
          createdBy: teacher.id,
          updatedBy: teacher.id,
        } as Feedback);

        sampleFeedbacks.push(feedback);
      }
    }

    if (sampleFeedbacks.length > 0) {
      await this.feedbackRepository.save(sampleFeedbacks);
      this.logger.log(`Created ${sampleFeedbacks.length} sample feedback items`);
    }
  }

  private generateSampleFeedback(percentage: number): string {
    if (percentage >= 90) {
      return 'Excellent work! You demonstrate a thorough understanding of the concepts.';
    } else if (percentage >= 80) {
      return 'Good job! Your work shows solid understanding with room for minor improvements.';
    } else if (percentage >= 70) {
      return 'Satisfactory work. You understand the basics but could benefit from deeper analysis.';
    } else if (percentage >= 60) {
      return 'Your work meets minimum requirements but needs significant improvement in several areas.';
    } else {
      return 'This work needs substantial improvement. Please review the concepts and seek additional help.';
    }
  }

  private generateSampleFeedbackContent(): string {
    const feedbackOptions = [
      'Your analysis demonstrates clear understanding of the key concepts.',
      'Consider providing more specific examples to support your arguments.',
      'The structure of your response could be improved for better clarity.',
      'Good use of relevant terminology and concepts.',
      'Your conclusion effectively summarizes the main points.',
      'Some grammatical errors detract from the overall quality.',
      'Excellent critical thinking evident throughout your response.',
      'More depth of analysis would strengthen your argument.',
    ];

    return feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
  }

  private generateSampleSuggestion(): string {
    const suggestions = [
      'Try using more specific examples from the course material.',
      'Consider reorganizing your response with clearer topic sentences.',
      'Review the grammar guidelines in the course resources.',
      'Expand on your analysis by exploring alternative perspectives.',
      'Include more citations to support your arguments.',
      'Break down complex ideas into smaller, clearer points.',
    ];

    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }
}
