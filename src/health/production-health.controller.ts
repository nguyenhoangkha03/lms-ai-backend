import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ProductionHealthService } from './production-health.service';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('Health & Monitoring')
@Controller('health')
export class ProductionHealthController {
  constructor(
    private health: HealthCheckService,
    private productionHealth: ProductionHealthService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Comprehensive health check' })
  @ApiResponse({ status: 200, description: 'All systems healthy' })
  @ApiResponse({ status: 503, description: 'One or more systems unhealthy' })
  async check() {
    return this.health.check([
      () => this.productionHealth.checkDatabase(),
      () => this.productionHealth.checkRedis(),
      () => this.productionHealth.checkSystemResources(),
      () => this.productionHealth.checkExternalServices(),
      () => this.productionHealth.checkSSLCertificate(),
    ]);
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  async ready() {
    return this.health.check([
      () => this.productionHealth.checkDatabase(),
      () => this.productionHealth.checkRedis(),
    ]);
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  async live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed system information' })
  @ApiResponse({ status: 200, description: 'Detailed system health information' })
  async detailed() {
    const [database, redis, system, external, ssl] = await Promise.allSettled([
      this.productionHealth.checkDatabase(),
      this.productionHealth.checkRedis(),
      this.productionHealth.checkSystemResources(),
      this.productionHealth.checkExternalServices(),
      this.productionHealth.checkSSLCertificate(),
    ]);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      checks: {
        database: database.status === 'fulfilled' ? database.value : { status: 'error' },
        redis: redis.status === 'fulfilled' ? redis.value : { status: 'error' },
        system: system.status === 'fulfilled' ? system.value : { status: 'error' },
        external: external.status === 'fulfilled' ? external.value : { status: 'error' },
        ssl: ssl.status === 'fulfilled' ? ssl.value : { status: 'error' },
      },
    };
  }
}
