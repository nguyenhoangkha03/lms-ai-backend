import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { ContentTag, TagCategory, TagType } from '../entities/content-tag.entity';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { PythonAiServiceService } from '../../ai/services/python-ai-service.service';
import {
  GenerateTagsDto,
  CreateContentTagDto,
  UpdateContentTagDto,
  TagQueryDto,
} from '../dto/content-tagging.dto';
import { ContentTagResponseDto } from '../dto/content-analysis-responses.dto';

@Injectable()
export class ContentTaggingService {
  private readonly logger = new Logger(ContentTaggingService.name);

  constructor(
    @InjectRepository(ContentTag)
    private tagRepository: Repository<ContentTag>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    private pythonAiService: PythonAiServiceService,
  ) {}

  async generateTags(
    generateTagsDto: GenerateTagsDto,
    userId?: string,
  ): Promise<ContentTagResponseDto[]> {
    const {
      contentType,
      contentId,
      maxTags,
      categories,
      minConfidence,
      forceRegenerate,
      includeManualTags: _,
    } = generateTagsDto;

    // Check if content exists
    const content = await this.getContent(contentType, contentId);
    if (!content) {
      throw new NotFoundException(`${contentType} with ID ${contentId} not found`);
    }

    // Check for existing tags if not forcing regeneration
    if (!forceRegenerate) {
      const existingTags = await this.tagRepository.find({
        where: {
          contentType,
          contentId,
          isActive: true,
          ...(categories && { category: In(categories) }),
        },
      });

      if (existingTags.length > 0) {
        this.logger.log(
          `Found ${existingTags.length} existing tags for ${contentType}:${contentId}`,
        );
        return existingTags.map(tag => this.mapToResponseDto(tag));
      }
    }

    try {
      // Extract content text for analysis
      const contentText = this.extractContentText(content);

      // Generate tags using AI service
      const aiResponse = await this.pythonAiService.analyzeContentForTagging({
        content: {
          id: contentId,
          type: contentType,
          title: content.title,
          description: content.description || '',
          text: contentText,
        },
        preferences: {
          maxTags,
          categories: categories || Object.values(TagCategory),
          minConfidence: minConfidence || 0.5,
          includeKeywords: true,
          includeDifficulty: true,
          includeTopics: true,
        },
      });

      // Create tags from AI response
      const createdTags: ContentTag[] = [];

      for (const tag of aiResponse.tags) {
        if (tag.confidence >= (minConfidence || 0.5)) {
          const newTag = this.tagRepository.create({
            contentType,
            contentId,
            tag: tag.name,
            category: this.mapAICategoryToTagCategory(tag.category),
            type: TagType.AUTO_GENERATED,
            confidence: tag.confidence,
            description: tag.description,
            isActive: true,
            isVerified: false,
            createdBy: userId,
            aiModelVersion: aiResponse.model_version,
            extractionMethod: aiResponse.extraction_method,
            metadata: {
              keywords: tag.keywords,
              context: tag.context,
              relevanceScore: tag.relevanceScore,
              sourceText: tag.sourceText,
              algorithmUsed: aiResponse.algorithm_used,
              processingTime: aiResponse.processing_time,
            },
          });

          const savedTag = await this.tagRepository.save(newTag);
          createdTags.push(savedTag);
        }
      }

      this.logger.log(`Generated ${createdTags.length} tags for ${contentType}:${contentId}`);
      return createdTags.map(tag => this.mapToResponseDto(tag));
    } catch (error) {
      this.logger.error(`Failed to generate tags for ${contentType}:${contentId}`, error);

      // Fallback: generate basic tags from content
      return this.generateFallbackTags(contentType, contentId, content, userId);
    }
  }

  async createTag(
    createTagDto: CreateContentTagDto,
    userId?: string,
  ): Promise<ContentTagResponseDto> {
    const { contentType, contentId, tag, category, type, confidence, description } = createTagDto;

    // Check if content exists
    const content = await this.getContent(contentType, contentId);
    if (!content) {
      throw new NotFoundException(`${contentType} with ID ${contentId} not found`);
    }

    // Check for duplicate tag
    const existingTag = await this.tagRepository.findOne({
      where: {
        contentType,
        contentId,
        tag: tag.toLowerCase(),
        category,
        isActive: true,
      },
    });

    if (existingTag) {
      throw new BadRequestException(`Tag "${tag}" already exists for this content`);
    }

    const newTag = this.tagRepository.create({
      contentType,
      contentId,
      tag: tag.toLowerCase(),
      category,
      type,
      confidence: confidence || 1.0,
      description,
      isActive: true,
      isVerified: type === TagType.MANUAL,
      verifiedBy: type === TagType.MANUAL ? userId : undefined,
      verifiedAt: type === TagType.MANUAL ? new Date() : undefined,
      createdBy: userId,
    });

    const savedTag = await this.tagRepository.save(newTag);
    this.logger.log(`Created tag "${tag}" for ${contentType}:${contentId}`);

    return this.mapToResponseDto(savedTag);
  }

  async updateTag(
    tagId: string,
    updateTagDto: UpdateContentTagDto,
    userId?: string,
  ): Promise<ContentTagResponseDto> {
    const tag = await this.tagRepository.findOne({ where: { id: tagId } });
    if (!tag) {
      throw new NotFoundException(`Tag with ID ${tagId} not found`);
    }

    Object.assign(tag, updateTagDto);
    tag.updatedBy = userId;

    // If marking as verified
    if (updateTagDto.isVerified === true && !tag.verifiedBy) {
      tag.verifiedBy = userId;
      tag.verifiedAt = new Date();
    }

    const updatedTag = await this.tagRepository.save(tag);
    this.logger.log(`Updated tag ${tagId}`);

    return this.mapToResponseDto(updatedTag);
  }

  async deleteTag(tagId: string): Promise<void> {
    const result = await this.tagRepository.softDelete(tagId);
    if (result.affected === 0) {
      throw new NotFoundException(`Tag with ID ${tagId} not found`);
    }
    this.logger.log(`Deleted tag ${tagId}`);
  }

  async getTags(queryDto: TagQueryDto): Promise<ContentTagResponseDto[]> {
    const {
      contentType,
      contentId,
      category,
      type,
      search,
      minConfidence,
      verifiedOnly,
      activeOnly,
    } = queryDto;

    const where: any = {};

    if (contentType) where.contentType = contentType;
    if (contentId) where.contentId = contentId;
    if (category) where.category = category;
    if (type) where.type = type;
    if (search) where.tag = Like(`%${search}%`);
    if (minConfidence !== undefined) where.confidence = minConfidence;
    if (verifiedOnly) where.isVerified = true;
    if (activeOnly !== false) where.isActive = true;

    const tags = await this.tagRepository.find({
      where,
      order: { confidence: 'DESC', createdAt: 'DESC' },
    });

    return tags.map(tag => this.mapToResponseDto(tag));
  }

  async getTagsByContent(
    contentType: 'course' | 'lesson',
    contentId: string,
  ): Promise<ContentTagResponseDto[]> {
    const tags = await this.tagRepository.find({
      where: {
        contentType,
        contentId,
        isActive: true,
      },
      order: { confidence: 'DESC', category: 'ASC' },
    });

    return tags.map(tag => this.mapToResponseDto(tag));
  }

  async verifyTag(tagId: string, userId: string): Promise<ContentTagResponseDto> {
    const tag = await this.tagRepository.findOne({ where: { id: tagId } });
    if (!tag) {
      throw new NotFoundException(`Tag with ID ${tagId} not found`);
    }

    tag.isVerified = true;
    tag.verifiedBy = userId;
    tag.verifiedAt = new Date();
    tag.updatedBy = userId;

    const updatedTag = await this.tagRepository.save(tag);
    this.logger.log(`Verified tag ${tagId}`);

    return this.mapToResponseDto(updatedTag);
  }

  async bulkVerifyTags(tagIds: string[], userId: string): Promise<ContentTagResponseDto[]> {
    const tags = await this.tagRepository.find({
      where: { id: In(tagIds) },
    });

    const updatedTags = tags.map(tag => {
      tag.isVerified = true;
      tag.verifiedBy = userId;
      tag.verifiedAt = new Date();
      tag.updatedBy = userId;
      return tag;
    });

    const savedTags = await this.tagRepository.save(updatedTags);
    this.logger.log(`Bulk verified ${savedTags.length} tags`);

    return savedTags.map(tag => this.mapToResponseDto(tag));
  }

  private async getContent(
    contentType: 'course' | 'lesson',
    contentId: string,
  ): Promise<Course | Lesson | null> {
    if (contentType === 'course') {
      return this.courseRepository.findOne({ where: { id: contentId } });
    } else {
      return this.lessonRepository.findOne({ where: { id: contentId } });
    }
  }

  private extractContentText(content: Course | Lesson): string {
    let text = content.title + '\n';

    if (content.description) {
      text += content.description + '\n';
    }

    // For lessons, extract additional content
    if ('content' in content && content.content) {
      text += content.content + '\n';
    }

    // For courses, extract what you will learn and requirements
    if ('whatYouWillLearn' in content && content.whatYouWillLearn) {
      text += JSON.stringify(content.whatYouWillLearn) + '\n';
    }

    if ('requirements' in content && content.requirements) {
      text += JSON.stringify(content.requirements) + '\n';
    }

    return text;
  }

  private mapAICategoryToTagCategory(aiCategory: string): TagCategory {
    const categoryMap: Record<string, TagCategory> = {
      topic: TagCategory.TOPIC,
      difficulty: TagCategory.DIFFICULTY,
      skill: TagCategory.SKILL,
      subject: TagCategory.SUBJECT,
      objective: TagCategory.LEARNING_OBJECTIVE,
      type: TagCategory.CONTENT_TYPE,
      language: TagCategory.LANGUAGE,
    };

    return categoryMap[aiCategory.toLowerCase()] || TagCategory.TOPIC;
  }

  private async generateFallbackTags(
    contentType: 'course' | 'lesson',
    contentId: string,
    content: Course | Lesson,
    userId?: string,
  ): Promise<ContentTagResponseDto[]> {
    const fallbackTags: ContentTag[] = [];

    // Extract basic keywords from title and description
    const text = (content.title + ' ' + (content.description || '')).toLowerCase();
    const words = text.split(/\s+/).filter(word => word.length > 3);
    const uniqueWords = [...new Set(words)].slice(0, 5);

    for (const word of uniqueWords) {
      const tag = this.tagRepository.create({
        contentType,
        contentId,
        tag: word,
        category: TagCategory.TOPIC,
        type: TagType.AUTO_GENERATED,
        confidence: 0.5,
        isActive: true,
        isVerified: false,
        createdBy: userId,
        extractionMethod: 'fallback_keyword_extraction',
      });

      fallbackTags.push(await this.tagRepository.save(tag));
    }

    return fallbackTags.map(tag => this.mapToResponseDto(tag));
  }

  private mapToResponseDto(tag: ContentTag): ContentTagResponseDto {
    return {
      id: tag.id,
      contentType: tag.contentType,
      contentId: tag.contentId,
      tag: tag.tag,
      category: tag.category,
      type: tag.type,
      confidence: tag.confidence,
      description: tag.description,
      isActive: tag.isActive,
      isVerified: tag.isVerified,
      verifiedBy: tag.verifiedBy,
      verifiedAt: tag.verifiedAt,
      metadata: tag.metadata,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };
  }
}
