import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { MLModel } from '../entities/ml-model.entity';
import { ModelVersion } from '../entities/model-version.entity';
import { CreateMLModelDto, UpdateMLModelDto } from '../dto/ml-model.dto';
import { ModelStatus } from '@/common/enums/ai.enums';

@Injectable()
export class MLModelService {
  private readonly logger = new Logger(MLModelService.name);

  constructor(
    @InjectRepository(MLModel)
    private readonly modelRepository: Repository<MLModel>,
    @InjectRepository(ModelVersion)
    private readonly versionRepository: Repository<ModelVersion>,
  ) {}

  async create(createModelDto: CreateMLModelDto & { createdBy: string }): Promise<MLModel> {
    this.logger.log(`Creating new ML model: ${createModelDto.name}`);

    const model = this.modelRepository.create({
      ...createModelDto,
      status: ModelStatus.DEVELOPMENT,
      isActive: true,
      isDeployed: false,
    });

    return this.modelRepository.save(model);
  }

  async findAll(filters?: {
    type?: string;
    status?: string;
    framework?: string;
  }): Promise<MLModel[]> {
    const options: FindManyOptions<MLModel> = {
      where: {
        isActive: true,
        ...(filters?.type && { modelType: filters.type as any }),
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.framework && { framework: filters.framework as any }),
      },
      relations: ['versions', 'creator'],
      order: { createdAt: 'DESC' },
    };

    return this.modelRepository.find(options);
  }

  async findById(id: string): Promise<MLModel> {
    const model = await this.modelRepository.findOne({
      where: { id, isActive: true },
      relations: ['versions', 'creator'],
    });

    if (!model) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }

    return model;
  }

  async update(id: string, updateModelDto: UpdateMLModelDto): Promise<MLModel> {
    this.logger.log(`Updating ML model: ${id}`);

    const model = await this.findById(id);
    Object.assign(model, updateModelDto);

    return this.modelRepository.save(model);
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting ML model: ${id}`);

    const model = await this.findById(id);
    model.isActive = false;
    model.status = ModelStatus.ARCHIVED;

    await this.modelRepository.save(model);
  }

  async getVersions(modelId: string): Promise<ModelVersion[]> {
    const _model = await this.findById(modelId);

    return this.versionRepository.find({
      where: { modelId },
      order: { createdAt: 'DESC' },
    });
  }

  async getActiveModels(): Promise<MLModel[]> {
    return this.modelRepository.find({
      where: {
        isActive: true,
        isDeployed: true,
        status: ModelStatus.PRODUCTION,
      },
      relations: ['versions'],
    });
  }
}
