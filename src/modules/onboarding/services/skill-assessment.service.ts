import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { StudentProfile } from '@/modules/user/entities/student-profile.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Assessment } from '@/modules/assessment/entities/assessment.entity';
import { AssessmentAttempt } from '@/modules/assessment/entities/assessment-attempt.entity';
import { Question } from '@/modules/assessment/entities/question.entity';
import { Course } from '@/modules/course/entities/course.entity';
import { Category } from '@/modules/course/entities/category.entity';
import {
  SkillAssessmentDto,
  SkillAssessmentSubmissionDto,
  AssessmentResultDto,
  AssessmentQuestionDto,
  QuestionType,
} from '../dto/onboarding.dto';
import {
  QuestionType as BaseQuestionType,
  AssessmentType,
  AssessmentStatus,
  DifficultyLevel,
} from '@/common/enums/assessment.enums';
import { UserType, UserStatus } from '@/common/enums/user.enums';
import { CourseStatus } from '@/common/enums/course.enums';
import { WinstonService } from '@/logger/winston.service';

import { HttpService } from '@nestjs/axios';
import { InternalServerErrorException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

// ... (rest of the imports)

@Injectable()
export class SkillAssessmentService {
  private readonly logger: WinstonService;
  constructor(
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentAttempt)
    private readonly assessmentAttemptRepository: Repository<AssessmentAttempt>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService, // Thêm HttpService
    logger: WinstonService,
  ) {
    this.logger = logger;
    this.logger.setContext(SkillAssessmentService.name);
  }

  async getAssessmentQuestions(userId: string): Promise<SkillAssessmentDto> {
    // Fallback method - use general assessment
    return this.getGeneralAssessmentQuestions(userId);
  }

  async getAssessmentQuestionsByCategory(
    userId: string,
    categoryId: string,
  ): Promise<SkillAssessmentDto> {
    this.logger.log(
      `[ASSESSMENT DEBUG] Starting assessment question retrieval for category: ${categoryId}`,
    );

    const categoryWithDescendants = await this.getCategoryDescendants(categoryId);
    const categoryIds = [categoryId, ...categoryWithDescendants.map(c => c.id)];

    this.logger.log(
      `[ASSESSMENT DEBUG] Found ${categoryIds.length} categories in tree: ${categoryIds.join(', ')}`,
    );

    const courses = await this.courseRepository.find({
      where: { categoryId: In(categoryIds), status: CourseStatus.PUBLISHED },
    });

    this.logger.log(
      `[ASSESSMENT DEBUG] Found ${courses.length} courses for these categories. Course IDs: ${courses.map(c => c.id).join(', ')}`,
    );

    if (courses.length === 0) {
      this.logger.warn(`[ASSESSMENT DEBUG] No courses found. Falling back to general questions.`);
      return this.getGeneralAssessmentQuestions(userId);
    }

    const courseIds = courses.map(c => c.id);
    const assessments = await this.assessmentRepository.find({
      where: { courseId: In(courseIds), status: AssessmentStatus.PUBLISHED },
    });

    this.logger.log(
      `[ASSESSMENT DEBUG] Found ${assessments.length} assessments for these courses. Assessment IDs: ${assessments.map(a => a.id).join(', ')}`,
    );

    if (assessments.length === 0) {
      this.logger.warn(
        `[ASSESSMENT DEBUG] No assessments found. Falling back to general questions.`,
      );
      return this.getGeneralAssessmentQuestions(userId);
    }

    const assessmentIds = assessments.map(a => a.id);
    const questions = await this.getQuestionsByDifficultyAndAssessments(assessmentIds);

    if (questions.length < 8) {
      this.logger.warn(
        `[ASSESSMENT DEBUG] Not enough questions found (${questions.length}). Falling back to general questions.`,
      );
      return this.getGeneralAssessmentQuestions(userId);
    }

    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });

    this.logger.log(
      `[ASSESSMENT DEBUG] Successfully found ${questions.length} questions. Proceeding with assessment.`,
    );

    return {
      id: `category-assessment-${categoryId}`,
      title: `${category?.name || 'Category'} Skill Assessment`,
      description: `Assess your skills in ${category?.name || 'the selected category'}`,
      questions,
      timeLimit: 20,
      totalQuestions: questions.length,
      categoryId: categoryId,
    };
  }

  private async getGeneralAssessmentQuestions(userId: string): Promise<SkillAssessmentDto> {
    // Ensure onboarding assessment exists in database
    const assessment = await this.ensureOnboardingAssessmentExists();

    if (!assessment) {
      throw new NotFoundException('Failed to create onboarding assessment');
    }

    // Fetch questions from the database
    const questions = await this.questionRepository.find({
      where: { assessmentId: assessment.id },
      order: { orderIndex: 'ASC' },
    });

    // Convert database questions to DTO format
    const assessmentQuestions: AssessmentQuestionDto[] = questions.map(question => ({
      id: question.id,
      questionText: question.questionText,
      type: this.mapQuestionType(question.questionType),
      options: question.options ? JSON.parse(question.options) : undefined,
      required: true, // All onboarding questions are required
      category: this.extractCategoryFromMetadata(question),
      skillArea: this.extractSkillAreaFromMetadata(question),
      hint: question.hint,
    }));

    const skillAssessmentDto: SkillAssessmentDto = {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      questions: assessmentQuestions,
      timeLimit: assessment.timeLimit || 20, // Default 20 minutes
      totalQuestions: assessmentQuestions.length,
    };

    this.logger.log(
      `General skill assessment questions loaded for user ${userId}, total questions: ${assessmentQuestions.length}`,
    );

    return skillAssessmentDto;
  }

  async submitAssessment(
    userId: string,
    submissionDto: SkillAssessmentSubmissionDto,
  ): Promise<AssessmentResultDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studentProfile'],
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    // Calculate skill scores based on responses
    const skillScores = this.calculateSkillScores(submissionDto.responses);
    const overallScore = this.calculateOverallScore(skillScores);
    const recommendations = this.generateRecommendations(skillScores, submissionDto.responses);

    const result: AssessmentResultDto = {
      id: `assessment-result-${Date.now()}`,
      studentId: userId,
      assessmentId: 'onboarding-skill-assessment',
      responses: submissionDto.responses,
      skillScores,
      overallScore,
      recommendations,
      completedAt: new Date().toISOString(),
    };

    // Save assessment result to student profile
    const studentProfile = user.studentProfile;
    const analyticsData = studentProfile.analyticsData || {};
    analyticsData.skillAssessmentResults = result;
    analyticsData.skillAssessmentCompleted = true;

    await this.studentProfileRepository.update(studentProfile.id, {
      analyticsData,
      lastActivityAt: new Date(),
    });

    this.logger.log(
      `Skill assessment submitted for user ${userId}. Overall score: ${overallScore}`,
    );

    return result;
  }

  async getAssessmentResult(userId: string, assessmentId: string): Promise<AssessmentResultDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studentProfile'],
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const analyticsData = user.studentProfile.analyticsData;
    const assessmentResult = analyticsData?.skillAssessmentResults;

    if (!assessmentResult) {
      throw new NotFoundException('Assessment result not found');
    }

    return assessmentResult;
  }

  private calculateSkillScores(responses: any[]): Record<string, number> {
    const skillScores: Record<string, number> = {
      Programming: 0,
      'Programming Languages': 0,
      'Problem Solving': 0,
      Database: 0,
      'Web Development': 0,
      'Learning Style': 0,
    };

    responses.forEach(response => {
      switch (response.questionId) {
        case 'q1': // Programming experience
          const programmingLevels = [
            'Complete beginner',
            'Some experience',
            'Intermediate',
            'Advanced',
            'Expert',
          ];
          const programmingIndex = programmingLevels.indexOf(response.answer);
          skillScores['Programming'] = (programmingIndex + 1) * 20;
          break;

        case 'q2': // Programming languages
          if (response.answer === 'None') {
            skillScores['Programming Languages'] = 0;
          } else {
            skillScores['Programming Languages'] = 60;
          }
          break;

        case 'q4': // Problem-solving confidence
          skillScores['Problem Solving'] = parseInt(response.answer) * 20;
          break;

        case 'q6': // Database experience
          skillScores['Database'] =
            response.answer === 'true' || response.answer === true ? 70 : 20;
          break;

        case 'q8': // Web development experience
          skillScores['Web Development'] = parseInt(response.answer) * 20;
          break;

        default:
          break;
      }
    });

    return skillScores;
  }

  private calculateOverallScore(skillScores: Record<string, number>): number {
    const scores = Object.values(skillScores).filter(score => score > 0);
    if (scores.length === 0) return 0;

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  private generateRecommendations(skillScores: Record<string, number>, responses: any[]): string[] {
    const recommendations: string[] = [];

    // Programming recommendations
    if (skillScores['Programming'] < 40) {
      recommendations.push('Start with fundamental programming concepts and basic syntax');
      recommendations.push('Practice with beginner-friendly coding exercises');
    } else if (skillScores['Programming'] >= 40 && skillScores['Programming'] < 80) {
      recommendations.push('Focus on intermediate programming concepts and data structures');
      recommendations.push('Work on small projects to apply your knowledge');
    } else {
      recommendations.push('Explore advanced topics and contribute to open-source projects');
      recommendations.push('Consider specializing in a particular domain or technology');
    }

    // Database recommendations
    if (skillScores['Database'] < 40) {
      recommendations.push('Learn database fundamentals and SQL basics');
    }

    // Web development recommendations
    if (skillScores['Web Development'] < 60) {
      recommendations.push('Start with HTML, CSS, and JavaScript foundations');
      recommendations.push('Build simple web projects to practice');
    }

    // Learning style recommendations
    const learningStyleResponse = responses.find(r => r.questionId === 'q3');
    if (learningStyleResponse) {
      switch (learningStyleResponse.answer) {
        case 'Reading documentation':
          recommendations.push('Utilize comprehensive documentation and written tutorials');
          break;
        case 'Watching videos':
          recommendations.push('Focus on video-based courses and visual content');
          break;
        case 'Hands-on practice':
          recommendations.push('Prioritize interactive coding exercises and projects');
          break;
        case 'Group discussions':
          recommendations.push('Join study groups and participate in forums');
          break;
        case 'One-on-one tutoring':
          recommendations.push('Consider personalized mentoring and AI tutoring sessions');
          break;
      }
    }

    return recommendations;
  }

  private async ensureOnboardingAssessmentExists(): Promise<Assessment | null> {
    // Check if onboarding assessment already exists
    let existingAssessment = await this.assessmentRepository.findOne({
      where: { title: 'Initial Skill Assessment' },
      relations: ['questions'],
    });

    if (existingAssessment) {
      // If assessment exists but has no questions, create sample questions
      if (!existingAssessment.questions || existingAssessment.questions.length === 0) {
        await this.createSampleQuestions(existingAssessment.id);
        // Reload with questions
        existingAssessment = await this.assessmentRepository.findOne({
          where: { id: existingAssessment.id },
          relations: ['questions'],
        });
      }
      return existingAssessment;
    }

    // Find or create system user for onboarding assessments
    let systemUser = await this.userRepository.findOne({
      where: { email: 'system@lms-ai.com' },
    });

    if (!systemUser) {
      // Create system user if not exists
      systemUser = this.userRepository.create({
        email: 'system@lms-ai.com',
        username: 'system-user',
        passwordHash: 'system-generated-hash', // This should be properly hashed in production
        firstName: 'System',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      });
      systemUser = await this.userRepository.save(systemUser);
      this.logger.log('System user created for onboarding assessments');
    }

    // Create onboarding assessment
    const assessment = this.assessmentRepository.create({
      title: 'Initial Skill Assessment',
      description:
        'This assessment helps us understand your current skill level and learning preferences to create a personalized learning path.',
      teacherId: systemUser.id,
      assessmentType: AssessmentType.SURVEY,
      status: AssessmentStatus.PUBLISHED,
      timeLimit: 20,
      maxAttempts: 3,
      showResults: true,
      showCorrectAnswers: false,
    });

    const savedAssessment = await this.assessmentRepository.save(assessment);

    // Create sample questions for the assessment
    await this.createSampleQuestions(savedAssessment.id);

    this.logger.log('Onboarding assessment created successfully with sample questions');

    // Return assessment with questions
    return await this.assessmentRepository.findOne({
      where: { id: savedAssessment.id },
      relations: ['questions'],
    });
  }

  // Helper method to map database QuestionType enum to DTO QuestionType
  private mapQuestionType(dbType: BaseQuestionType): QuestionType {
    switch (dbType) {
      case BaseQuestionType.MULTIPLE_CHOICE:
        return QuestionType.MULTIPLE_CHOICE;
      case BaseQuestionType.TRUE_FALSE:
        return QuestionType.TRUE_FALSE;
      case BaseQuestionType.SHORT_ANSWER:
        return QuestionType.TEXT_INPUT;
      case BaseQuestionType.NUMERIC:
        return QuestionType.SCALE_RATING;
      default:
        return QuestionType.MULTIPLE_CHOICE;
    }
  }

  // Helper method to extract category from question metadata
  private extractCategoryFromMetadata(question: Question): string {
    try {
      const metadata = question.metadata ? JSON.parse(question.metadata) : {};
      return metadata.category || 'General';
    } catch {
      return 'General';
    }
  }

  // Helper method to extract skill area from question metadata
  private extractSkillAreaFromMetadata(question: Question): string {
    try {
      const metadata = question.metadata ? JSON.parse(question.metadata) : {};
      return metadata.skillArea || 'General Skills';
    } catch {
      return 'General Skills';
    }
  }

  // Create sample questions for onboarding assessment
  private async createSampleQuestions(assessmentId: string): Promise<void> {
    const sampleQuestions = [
      {
        questionText: 'What is your current experience level with programming?',
        questionType: BaseQuestionType.MULTIPLE_CHOICE,
        options: JSON.stringify([
          'Complete beginner',
          'Some experience',
          'Intermediate',
          'Advanced',
          'Expert',
        ]),
        correctAnswer: JSON.stringify('Complete beginner'), // Default answer for survey
        orderIndex: 0,
        metadata: JSON.stringify({ category: 'Technical Skills', skillArea: 'Programming' }),
      },
      {
        questionText: 'Which programming languages are you familiar with?',
        questionType: BaseQuestionType.MULTIPLE_CHOICE,
        options: JSON.stringify(['JavaScript', 'Python', 'Java', 'C++', 'PHP', 'None']),
        correctAnswer: JSON.stringify('None'),
        orderIndex: 1,
        metadata: JSON.stringify({
          category: 'Technical Skills',
          skillArea: 'Programming Languages',
        }),
      },
      {
        questionText: 'How do you prefer to learn new concepts?',
        questionType: BaseQuestionType.MULTIPLE_CHOICE,
        options: JSON.stringify([
          'Reading documentation',
          'Watching videos',
          'Hands-on practice',
          'Group discussions',
          'One-on-one tutoring',
        ]),
        correctAnswer: JSON.stringify('Hands-on practice'),
        orderIndex: 2,
        metadata: JSON.stringify({ category: 'Learning Style', skillArea: 'Learning Preferences' }),
      },
      {
        questionText: 'Rate your confidence in problem-solving (1-5)',
        questionType: BaseQuestionType.NUMERIC,
        options: JSON.stringify(['1', '2', '3', '4', '5']),
        correctAnswer: JSON.stringify('3'),
        orderIndex: 3,
        metadata: JSON.stringify({ category: 'Soft Skills', skillArea: 'Problem Solving' }),
      },
      {
        questionText: 'What are your main learning goals?',
        questionType: BaseQuestionType.SHORT_ANSWER,
        correctAnswer: JSON.stringify(''),
        orderIndex: 4,
        hint: 'Describe what you hope to achieve through learning',
        metadata: JSON.stringify({ category: 'Goals', skillArea: 'Learning Objectives' }),
      },
      {
        questionText: 'Do you have experience with databases?',
        questionType: BaseQuestionType.TRUE_FALSE,
        correctAnswer: JSON.stringify('false'),
        orderIndex: 5,
        metadata: JSON.stringify({ category: 'Technical Skills', skillArea: 'Database' }),
      },
      {
        questionText: 'How many hours per week can you dedicate to learning?',
        questionType: BaseQuestionType.MULTIPLE_CHOICE,
        options: JSON.stringify([
          'Less than 5 hours',
          '5-10 hours',
          '10-15 hours',
          '15-20 hours',
          'More than 20 hours',
        ]),
        correctAnswer: JSON.stringify('5-10 hours'),
        orderIndex: 6,
        metadata: JSON.stringify({ category: 'Time Management', skillArea: 'Study Schedule' }),
      },
      {
        questionText: 'Rate your experience with web development (1-5)',
        questionType: BaseQuestionType.NUMERIC,
        options: JSON.stringify(['1', '2', '3', '4', '5']),
        correctAnswer: JSON.stringify('1'),
        orderIndex: 7,
        metadata: JSON.stringify({ category: 'Technical Skills', skillArea: 'Web Development' }),
      },
    ];

    for (const questionData of sampleQuestions) {
      const question = this.questionRepository.create({
        ...questionData,
        assessmentId,
        points: 1,
        difficulty: 'medium' as any,
      });

      await this.questionRepository.save(question);
    }

    this.logger.log(`Created ${sampleQuestions.length} sample questions for onboarding assessment`);
  }

  private async getCategoryDescendants(categoryId: string): Promise<Category[]> {
    try {
      // Use direct parent-child relationship instead of TypeORM Tree
      // TypeORM Tree repository có thể bị vấn đề với mpath sau khi seeder

      // Comment out tree repository approach:
      // const categoryTreeRepository = this.dataSource.getTreeRepository(Category);
      // const category = await categoryTreeRepository.findOne({
      //   where: { id: categoryId },
      // });
      // const descendants = await categoryTreeRepository.findDescendants(category);

      // Use direct parent-child query
      const directChildren = await this.categoryRepository.find({
        where: { parentId: categoryId },
      });

      this.logger.log(
        `[ASSESSMENT DEBUG] Found ${directChildren.length} direct children for category ${categoryId}: ${directChildren.map(c => `${c.id} (${c.name})`).join(', ')}`,
      );

      // Recursively get all descendants
      let allDescendants: Category[] = [...directChildren];

      for (const child of directChildren) {
        const grandChildren = await this.getCategoryDescendants(child.id);
        allDescendants = allDescendants.concat(grandChildren);
      }

      this.logger.log(`[ASSESSMENT DEBUG] Total descendants found: ${allDescendants.length}`);
      return allDescendants;
    } catch (error) {
      this.logger.error(`Error getting category descendants: ${error.message}`);
      return [];
    }
  }

  private async getQuestionsByDifficultyAndAssessments(
    assessmentIds: string[],
  ): Promise<AssessmentQuestionDto[]> {
    try {
      const allQuestions = await this.questionRepository.find({
        where: { assessmentId: In(assessmentIds) },
      });

      this.logger.log(
        `[ASSESSMENT DEBUG] Total questions found in assessments: ${allQuestions.length}`,
      );

      const easyQuestions = allQuestions.filter(q => q.difficulty === DifficultyLevel.EASY);
      const mediumQuestions = allQuestions.filter(q => q.difficulty === DifficultyLevel.MEDIUM);
      const hardQuestions = allQuestions.filter(q => q.difficulty === DifficultyLevel.HARD);

      this.logger.log(
        `[ASSESSMENT DEBUG] Question breakdown - Easy: ${easyQuestions.length}, Medium: ${mediumQuestions.length}, Hard: ${hardQuestions.length}`,
      );

      const selectedQuestions = [
        ...this.shuffleAndPick(easyQuestions, 5),
        ...this.shuffleAndPick(mediumQuestions, 2),
        ...this.shuffleAndPick(hardQuestions, 1),
      ];

      this.logger.log(
        `[ASSESSMENT DEBUG] Selected ${selectedQuestions.length} questions after applying difficulty rules.`,
      );

      const shuffledQuestions = this.shuffleArray(selectedQuestions);

      return shuffledQuestions.map((question, index) => ({
        id: question.id,
        questionText: question.questionText,
        type: this.mapQuestionType(question.questionType),
        options: question.options ? JSON.parse(question.options) : undefined,
        required: true,
        category: this.extractCategoryFromMetadata(question),
        skillArea: this.extractSkillAreaFromMetadata(question),
        hint: question.hint,
        difficulty: question.difficulty,
        orderIndex: index,
      }));
    } catch (error) {
      this.logger.error(
        `[ASSESSMENT DEBUG] Error getting questions by difficulty: ${error.message}`,
      );
      return [];
    }
  }

  private shuffleAndPick<T>(array: T[], count: number): T[] {
    const shuffled = this.shuffleArray(array);
    return shuffled.slice(0, count);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private convertAnswerToBoolean(answer: string | number | string[]): boolean {
    if (typeof answer === 'boolean') {
      return answer;
    }

    if (typeof answer === 'string') {
      const lowerAnswer = answer.toLowerCase().trim();

      if (['true', 'yes', 'correct', '1'].includes(lowerAnswer)) {
        return true;
      }

      if (['false', 'no', 'incorrect', '0', ''].includes(lowerAnswer)) {
        return false;
      }

      // For multiple choice answers, assume correct answer = true
      // This is a simple heuristic, may need refinement based on actual logic
      return answer.length > 0; // Non-empty string = true
    }

    if (typeof answer === 'number') {
      return answer > 0; // Positive number = true
    }

    if (Array.isArray(answer)) {
      return answer.length > 0; // Non-empty array = true
    }

    return false; // Default fallback
  }

  private normalizeAnswer(answer: string): string {
    try {
      const parsed = JSON.parse(answer);
      if (typeof parsed === 'string') return parsed.trim();
    } catch {}
    return answer.trim();
  }

  private async checkAnswerForQuestion(question: {
    questionId: string;
    answer: string;
  }): Promise<boolean> {
    const qes = await this.questionRepository.findOne({ where: { id: question.questionId } });
    if (!qes) {
      return false;
    }

    const correct = this.normalizeAnswer(qes.correctAnswer!);
    const submitted = this.normalizeAnswer(question.answer);

    this.logger.log(`11111111111111111111111 ${correct}`);
    this.logger.log(`22222222222222222222222 ${submitted}`);
    this.logger.log(`33333333333333333333333 ${correct === submitted}`);

    return correct === submitted;
  }

  async submitAssessmentWithCategory(
    userId: string,
    submissionDto: SkillAssessmentSubmissionDto & { categoryId?: string },
  ): Promise<any> {
    // Change return type to be more flexible
    this.logger.log(`Submitting skill assessment for user: ${userId}`);

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studentProfile'],
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    this.logger.log(`Submitting skill assessment for userrrrrrrrrrrrrrr: ${userId}`);
    this.logger.log(
      `Submitting skill assessment for userrrrrrrrrrrrrrr: ${JSON.stringify(submissionDto)}`,
    );

    const data = await Promise.all(
      submissionDto.responses.map(async r => ({
        questionId: r.questionId,
        answer: await this.checkAnswerForQuestion({
          questionId: r.questionId,
          answer: r.answer as string,
        }),
      })),
    );

    const payload = { data };

    try {
      // Call Flask API
      const flaskApiUrl = 'http://localhost:5000/api/recommend';
      this.logger.log(
        `Calling Flask API at: ${flaskApiUrl} with payload: ${JSON.stringify(payload)}`,
      );
      const response = await firstValueFrom(this.httpService.post(flaskApiUrl, payload));

      const aiData = response.data;
      this.logger.log(`Received response from Flask API: ${JSON.stringify(aiData)}`);

      if (!aiData || !aiData.success) {
        throw new InternalServerErrorException('AI service returned an error.');
      }

      // Save analysis and learning path to student profile
      const studentProfile = user.studentProfile;
      const analyticsData = studentProfile.analyticsData || {};

      // Map Flask response to expected format
      const flaskData = aiData.data || {};

      // Map Flask recommendations to proper format
      const mappedRecommendations = (flaskData.recommendations || []).map(
        (rec: any, index: number) => ({
          id: rec.course_id || `rec_${index}`,
          title: rec.course_title || `Course ${index + 1}`,
          description: `${rec.course_level} level course with ${rec.accuracy_percentage} accuracy`,
          level: rec.course_level,
          priority: rec.priority_rank,
          priorityScore: rec.priority_score,
          accuracyPercentage: rec.accuracy_percentage,
          correctRatio: rec.correct_total_ratio,
          wrongRatio: rec.wrong_total_ratio,
          wrongEasyQuestions: rec.wrong_easy_questions,
          orderIndex: rec.order_index,
          dataSource: rec.data_source,
        }),
      );

      const analysis = {
        strategy: flaskData.strategy,
        strategyConfidence: flaskData.strategy_confidence,
        overallScore: Math.round((flaskData.strategy_confidence || 0.5) * 100),
        skillScores: {
          learning_strategy: Math.round((flaskData.strategy_confidence || 0.5) * 100),
        },
        recommendations: mappedRecommendations,
        totalRecommendations: flaskData.total_recommendations || mappedRecommendations.length,
      };

      const learningPath = mappedRecommendations.map((rec: any, index: number) => ({
        id: rec.id,
        title: rec.title,
        description: rec.description,
        level: rec.level,
        priority: rec.priority,
        courses: [rec], // Each recommendation is a course
        order: index,
      }));

      analyticsData.skillAssessmentResults = analysis;
      analyticsData.recommendedLearningPath = learningPath;
      analyticsData.skillAssessmentCompleted = true;
      if (submissionDto.categoryId) {
        analyticsData.selectedCategory = submissionDto.categoryId;
      }

      await this.studentProfileRepository.update(studentProfile.id, {
        analyticsData: analyticsData as any,
        lastActivityAt: new Date(),
      });

      this.logger.log(`Successfully saved AI analysis and learning path for user ${userId}`);

      // Return processed data to frontend in expected format
      return {
        ...analysis,
        learningPath: learningPath,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error calling Flask AI API', error.stack);
      const errorMessage =
        error.response?.data?.error || 'Failed to get learning path from AI service.';
      throw new InternalServerErrorException(errorMessage);
    }
  }
}
