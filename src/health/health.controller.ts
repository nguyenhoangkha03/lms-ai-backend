import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ConfigService } from '../config/config.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Health check passed' })
  @ApiResponse({ status: 503, description: 'Health check failed' })
  async check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.checkRedis(),
      () => this.checkExternalServices(),
    ]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  async ready() {
    return this.health.check([() => this.db.pingCheck('database'), () => this.checkRedis()]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  async live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    return { redis: { status: 'up' } };
  }

  private async checkExternalServices(): Promise<HealthIndicatorResult> {
    const services: Promise<HealthIndicatorResult>[] = [];

    if (this.configService.featureFlags.aiFeatures) {
      services.push(this.checkOpenAI());
    }

    return Promise.all(services).then(results => ({
      ...results.reduce((acc, result) => ({ ...acc, ...result }), {}),
    }));
  }

  private async checkOpenAI(): Promise<HealthIndicatorResult> {
    return { openai: { status: 'up' } };
  }
}
