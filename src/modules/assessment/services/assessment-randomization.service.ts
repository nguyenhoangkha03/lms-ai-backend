import { Injectable } from '@nestjs/common';
import { WinstonService } from '@/logger/winston.service';
import { Assessment } from '../entities/assessment.entity';
import { Question } from '../entities/question.entity';
import { QuestionType } from '@/common/enums/assessment.enums';

@Injectable()
export class AssessmentRandomizationService {
  constructor(private readonly logger: WinstonService) {
    this.logger.setContext(AssessmentRandomizationService.name);
  }

  randomizeQuestionsForStudent(
    assessment: Assessment,
    questions: Question[],
    studentId: string,
  ): Question[] {
    if (!assessment.randomizeQuestions) {
      return questions.sort((a, b) => a.orderIndex - b.orderIndex);
    }
    const seed = this.generateSeed(studentId, assessment.id);
    const randomizedQuestions = [...questions];

    for (let i = randomizedQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(this.seededRandom(seed + i) * (i + 1));
      [randomizedQuestions[i], randomizedQuestions[j]] = [
        randomizedQuestions[j],
        randomizedQuestions[i],
      ];
    }

    return randomizedQuestions;
  }

  randomizeAnswerOptions(question: Question, studentId: string, assessmentId: string): Question {
    if (question.questionType !== QuestionType.MULTIPLE_CHOICE || !question.optionsJson?.length) {
      return question;
    }

    const options = [...question.optionsJson];
    const correctAnswer = question.correctAnswerJson;

    const seed = this.generateSeed(studentId, assessmentId, question.id);

    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(this.seededRandom(seed + i) * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    const newCorrectAnswer = this.updateCorrectAnswerMapping(
      question.optionsJson,
      options,
      correctAnswer,
    );

    return {
      ...question,
      options: JSON.stringify(options),
      correctAnswer: JSON.stringify(newCorrectAnswer),
    } as Question;
  }

  generateAssessmentInstance(
    assessment: Assessment,
    questions: Question[],
    studentId: string,
  ): {
    assessment: Assessment;
    questions: Question[];
    metadata: any;
  } {
    let processedQuestions = assessment.randomizeQuestions
      ? this.randomizeQuestionsForStudent(assessment, questions, studentId)
      : questions.sort((a, b) => a.orderIndex - b.orderIndex);

    if (assessment.randomizeAnswers) {
      processedQuestions = processedQuestions.map(question =>
        this.randomizeAnswerOptions(question, studentId, assessment.id),
      );
    }

    processedQuestions = processedQuestions.map(
      (question, index) =>
        ({
          ...question,
          orderIndex: index,
        }) as Question,
    );

    const metadata = {
      generatedAt: new Date(),
      studentId,
      assessmentId: assessment.id,
      randomizationApplied: {
        questions: assessment.randomizeQuestions,
        answers: assessment.randomizeAnswers,
      },
      questionMapping: processedQuestions.map((q, index) => ({
        originalId: q.id,
        displayOrder: index,
        originalOrder: q.orderIndex,
      })),
    };

    return {
      assessment,
      questions: processedQuestions,
      metadata,
    };
  }

  applyAntiCheatMeasures(
    assessment: Assessment,
    questions: Question[],
    studentId: string,
  ): {
    questions: Question[];
    antiCheatData: any;
  } {
    const antiCheatSettings = assessment.antiCheatSettingsJson;
    const antiCheatData: any = {
      appliedMeasures: [],
      generatedAt: new Date(),
      studentId,
    };

    let processedQuestions = [...questions];

    if (antiCheatSettings.questionPoolRandomization?.enabled) {
      const poolSize = antiCheatSettings.questionPoolRandomization.poolSize || questions.length;
      const selectedQuestions = this.selectRandomQuestions(
        questions,
        poolSize,
        studentId,
        assessment.id,
      );
      processedQuestions = selectedQuestions;
      antiCheatData.appliedMeasures.push('question_pool_randomization');
    }

    if (antiCheatSettings.difficultyBalancing?.enabled) {
      processedQuestions = this.balanceQuestionDifficulty(
        processedQuestions,
        antiCheatSettings.difficultyBalancing,
      );
      antiCheatData.appliedMeasures.push('difficulty_balancing');
    }

    if (antiCheatSettings.timePressureVariation?.enabled) {
      const timeVariation = this.calculateTimeVariation(
        assessment.timeLimit || 0,
        antiCheatSettings.timePressureVariation,
        studentId,
      );
      antiCheatData.timeLimit = timeVariation;
      antiCheatData.appliedMeasures.push('time_pressure_variation');
    }

    if (antiCheatSettings.decoyQuestions?.enabled) {
      const decoyQuestions = this.generateDecoyQuestions(
        processedQuestions,
        antiCheatSettings.decoyQuestions,
        studentId,
      );
      processedQuestions = [...processedQuestions, ...decoyQuestions];
      antiCheatData.appliedMeasures.push('decoy_questions');
      antiCheatData.decoyQuestionIds = decoyQuestions.map(q => q.id);
    }

    return {
      questions: processedQuestions,
      antiCheatData,
    };
  }

  private generateSeed(...inputs: string[]): number {
    const combined = inputs.join('');
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private updateCorrectAnswerMapping(
    originalOptions: any[],
    randomizedOptions: any[],
    originalCorrectAnswer: any,
  ): any {
    if (typeof originalCorrectAnswer === 'string' || typeof originalCorrectAnswer === 'number') {
      const originalIndex = originalOptions.findIndex(
        option => option.id === originalCorrectAnswer || option.value === originalCorrectAnswer,
      );
      if (originalIndex !== -1) {
        const newIndex = randomizedOptions.findIndex(
          option => option.id === originalOptions[originalIndex].id,
        );
        return randomizedOptions[newIndex]?.id || randomizedOptions[newIndex]?.value;
      }
    } else if (Array.isArray(originalCorrectAnswer)) {
      return originalCorrectAnswer.map(answer => {
        const originalIndex = originalOptions.findIndex(
          option => option.id === answer || option.value === answer,
        );
        if (originalIndex !== -1) {
          const newIndex = randomizedOptions.findIndex(
            option => option.id === originalOptions[originalIndex].id,
          );
          return randomizedOptions[newIndex]?.id || randomizedOptions[newIndex]?.value;
        }
        return answer;
      });
    }

    return originalCorrectAnswer;
  }

  private selectRandomQuestions(
    questions: Question[],
    count: number,
    studentId: string,
    assessmentId: string,
  ): Question[] {
    if (questions.length <= count) return questions;

    const seed = this.generateSeed(studentId, assessmentId, 'question_pool');
    const shuffled = [...questions];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.seededRandom(seed + i) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  private balanceQuestionDifficulty(questions: Question[], settings: any): Question[] {
    const targetDistribution = settings.targetDistribution || {
      easy: 0.3,
      medium: 0.5,
      hard: 0.2,
    };

    const grouped = questions.reduce(
      (acc, question) => {
        const difficulty = question.difficulty || 'medium';
        if (!acc[difficulty]) acc[difficulty] = [];
        acc[difficulty].push(question);
        return acc;
      },
      {} as Record<string, Question[]>,
    );

    const balanced: Question[] = [];
    const totalCount = questions.length;

    Object.keys(targetDistribution).forEach(difficulty => {
      const targetCount = Math.floor(totalCount * targetDistribution[difficulty]);
      const availableQuestions = grouped[difficulty] || [];
      const selectedCount = Math.min(targetCount, availableQuestions.length);

      balanced.push(...availableQuestions.slice(0, selectedCount));
    });

    const usedIds = new Set(balanced.map(q => q.id));
    const remaining = questions.filter(q => !usedIds.has(q.id));
    const remainingSlots = totalCount - balanced.length;

    balanced.push(...remaining.slice(0, remainingSlots));

    return balanced;
  }

  private calculateTimeVariation(baseTimeLimit: number, settings: any, studentId: string): number {
    const variationPercent = settings.variationPercent || 10;
    const seed = this.generateSeed(studentId, 'time_variation');
    const randomFactor = this.seededRandom(seed);

    // Apply ±variationPercent variation
    const variation = (randomFactor - 0.5) * 2 * (variationPercent / 100);
    const newTimeLimit = baseTimeLimit * (1 + variation);

    return Math.max(Math.floor(newTimeLimit), baseTimeLimit * 0.5); // Minimum 50% of original time
  }

  private generateDecoyQuestions(
    realQuestions: Question[],
    settings: any,
    _studentId: string,
  ): Question[] {
    const decoyCount = Math.min(settings.count || 2, realQuestions.length);
    const decoys: Question[] = [];

    for (let i = 0; i < decoyCount; i++) {
      const sourceQuestion = realQuestions[i % realQuestions.length];
      const decoy = {
        ...sourceQuestion,
        id: `decoy_${sourceQuestion.id}_${i}`,
        questionText: this.generateDecoyQuestionText(sourceQuestion.questionText),
        isDecoy: true,
        points: 0,
      } as unknown as Question;

      decoys.push(decoy);
    }

    return decoys;
  }

  private generateDecoyQuestionText(originalText: string): string {
    const variations = [
      `[Practice] ${originalText}`,
      `[Verification] ${originalText}`,
      `[Bonus] ${originalText}`,
    ];

    const randomIndex = Math.floor(Math.random() * variations.length);
    return variations[randomIndex];
  }
}
