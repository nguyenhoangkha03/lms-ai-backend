import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdaptiveContent } from '../../modules/intelligent-tutoring/entities/adaptive-content.entity';
import {
  ContentType,
  DifficultyLevel,
  AdaptationType,
  LearningStyleType,
} from '@/common/enums/tutoring.enums';

@Injectable()
export class AdaptiveContentSeeder {
  constructor(
    @InjectRepository(AdaptiveContent)
    private readonly contentRepository: Repository<AdaptiveContent>,
  ) {}

  async seed(): Promise<void> {
    const adaptiveContents = [
      {
        contentType: ContentType.EXPLANATION,
        title: 'JavaScript Variables - Visual Explanation',
        content: `Variables in JavaScript are like containers that store data values. Think of them as labeled boxes where you can put different types of information.

        Visual learners benefit from diagrams showing:
        - Variable declaration: let name = "John";
        - Variable assignment: name = "Jane";
        - Different data types: strings, numbers, booleans
        
        Interactive example:
        Try changing the values and see how the output changes!`,
        difficultyLevel: DifficultyLevel.EASY,
        adaptationType: AdaptationType.LEARNING_STYLE_ADAPTATION,
        targetLearningStyles: [LearningStyleType.VISUAL],
        prerequisites: [],
        conceptsCovered: ['variables', 'data types', 'assignment'],
        estimatedDuration: 10,
        effectivenessScore: 0.85,
        adaptationRules: {
          triggerConditions: ['Learning style: visual', 'Topic: JavaScript basics'],
          adaptationActions: ['Show diagrams', 'Use color coding', 'Interactive examples'],
          successCriteria: ['Comprehension > 80%', 'Engagement > 70%'],
        },
        mediaAssets: {
          images: ['variable-diagram.png', 'data-types-chart.png'],
          videos: ['variables-explained-visual.mp4'],
        },
        interactiveElements: {
          hasCodeEditor: true,
          hasDragDrop: false,
          hasQuiz: true,
          hasSimulation: false,
        },
      },
      {
        contentType: ContentType.EXERCISE,
        title: 'Functions Practice - Hands-on Approach',
        content: `Let's practice JavaScript functions with real-world examples!

        Kinesthetic learners learn best by doing:
        
        Exercise 1: Build a calculator function
        - Start with basic addition
        - Add subtraction, multiplication, division
        - Test with different numbers
        
        Exercise 2: Create a greeting function
        - Take a name as parameter
        - Return personalized greeting
        - Try with your own name!
        
        Remember: The best way to learn coding is by coding!`,
        difficultyLevel: DifficultyLevel.MEDIUM,
        adaptationType: AdaptationType.LEARNING_STYLE_ADAPTATION,
        targetLearningStyles: [LearningStyleType.KINESTHETIC],
        prerequisites: ['variables', 'basic syntax'],
        conceptsCovered: ['functions', 'parameters', 'return values'],
        estimatedDuration: 20,
        effectivenessScore: 0.9,
        adaptationRules: {
          triggerConditions: ['Learning style: kinesthetic', 'Topic: JavaScript functions'],
          adaptationActions: [
            'Provide hands-on exercises',
            'Step-by-step practice',
            'Real-world examples',
          ],
          successCriteria: ['Completion rate > 85%', 'Code runs successfully'],
        },
        interactiveElements: {
          hasCodeEditor: true,
          hasDragDrop: false,
          hasQuiz: false,
          hasSimulation: true,
        },
      },
      {
        contentType: ContentType.LESSON,
        title: 'Object-Oriented Programming - Audio Explanation',
        content: `Welcome to Object-Oriented Programming in JavaScript!

        This audio-enhanced lesson explains OOP concepts through:
        
        🎵 Narrated explanations with clear pronunciation
        🎵 Step-by-step audio walkthroughs
        🎵 Verbal examples and analogies
        
        Key concepts covered:
        - Objects and Classes
        - Methods and Properties  
        - Inheritance and Encapsulation
        
        Listen carefully and follow along with the code examples.
        Feel free to pause and replay sections as needed!`,
        difficultyLevel: DifficultyLevel.HARD,
        adaptationType: AdaptationType.LEARNING_STYLE_ADAPTATION,
        targetLearningStyles: [LearningStyleType.AUDITORY],
        prerequisites: ['functions', 'variables', 'basic syntax'],
        conceptsCovered: ['objects', 'classes', 'inheritance', 'encapsulation'],
        estimatedDuration: 30,
        effectivenessScore: 0.82,
        adaptationRules: {
          triggerConditions: ['Learning style: auditory', 'Topic: OOP'],
          adaptationActions: ['Include audio narration', 'Verbal examples', 'Discussion prompts'],
          successCriteria: ['Listening completion > 90%', 'Concept quiz > 75%'],
        },
        mediaAssets: {
          audio: ['oop-explanation.mp3', 'inheritance-examples.mp3'],
          documents: ['oop-transcript.pdf'],
        },
        interactiveElements: {
          hasCodeEditor: true,
          hasDragDrop: false,
          hasQuiz: true,
          hasSimulation: false,
        },
      },
      {
        contentType: ContentType.READING,
        title: 'Async Programming - Comprehensive Text Guide',
        content: `Asynchronous Programming in JavaScript: A Complete Guide

        Table of Contents:
        1. Introduction to Asynchronous Programming
        2. Callbacks and Callback Hell
        3. Promises - A Better Solution
        4. Async/Await - Modern Approach
        5. Error Handling in Async Code
        6. Real-world Examples and Best Practices

        1. Introduction to Asynchronous Programming
        
        Asynchronous programming allows JavaScript to perform long-running operations without blocking the main thread. This is crucial for web applications that need to remain responsive while fetching data, processing files, or performing other time-consuming tasks.

        Key concepts:
        - Non-blocking execution
        - Event loop
        - Concurrency vs Parallelism
        
        [Detailed explanations continue...]

        Take notes as you read and try the code examples in your development environment.`,
        difficultyLevel: DifficultyLevel.VERY_HARD,
        adaptationType: AdaptationType.LEARNING_STYLE_ADAPTATION,
        targetLearningStyles: [LearningStyleType.READING_WRITING],
        prerequisites: ['functions', 'callbacks', 'promises'],
        conceptsCovered: ['async/await', 'promises', 'event loop', 'error handling'],
        estimatedDuration: 45,
        effectivenessScore: 0.88,
        adaptationRules: {
          triggerConditions: ['Learning style: reading/writing', 'Topic: async programming'],
          adaptationActions: ['Detailed text explanations', 'Code examples', 'Note-taking prompts'],
          successCriteria: ['Reading completion > 95%', 'Note quality assessment'],
        },
        mediaAssets: {
          documents: ['async-programming-guide.pdf', 'code-examples.txt'],
        },
        interactiveElements: {
          hasCodeEditor: true,
          hasDragDrop: false,
          hasQuiz: true,
          hasSimulation: false,
        },
      },
    ];

    for (const contentData of adaptiveContents) {
      const existingContent = await this.contentRepository.findOne({
        where: { title: contentData.title },
      });

      if (!existingContent) {
        const content = this.contentRepository.create(contentData);
        await this.contentRepository.save(content);
      }
    }

    console.log('✅ Adaptive content seeded successfully');
  }
}
