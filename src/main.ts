import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import { AllExceptionsFilter } from '@/common/filters/http-exception.filter';
import { ValidationExceptionFilter } from '@/common/filters/validation-exception.filter';
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonService } from '@/logger/winston.service';
import { SSLConfig } from '@/config/ssl.config';
import * as cookieParser from 'cookie-parser';
import { SanitizeInterceptor } from '@/common/interceptors/sanitize.interceptor';
// Add new
import cluster from 'cluster';
import os from 'os';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const httpsOptions = SSLConfig.getHttpsOptions();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    httpsOptions,
    bufferLogs: true,
  });
  //   const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  //     httpsOptions,
  //     logger: WinstonModule.createLogger(),
  //     bufferLogs: true,
  //   });

  const logger = app.get(WinstonService);
  logger.setContext('Bootstrap');
  app.useLogger(logger);

  logger.log('Application started');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port');
  const apiPrefix = configService.get<string>('app.apiPrefix');
  const corsOrigins = configService.get<string[]>('app.corsOrigins');
  const securityHelmet = configService.get<boolean>('security.helmet');
  const securityCompression = configService.get<boolean>('security.compression');
  const cookieSecret = configService.get<string>('cookie.secret');

  if (securityHelmet) {
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false,
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      }),
    );
  }

  // Dùng thư viện compression (Express middleware) để nén dữ liệu HTTP response (thường là gzip hoặc Brotli).
  if (securityCompression) {
    app.use(
      compression({
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        },
        level: 6,
        threshold: 1024,
      }),
    );
  }

  app.set('trust proxy', 1);

  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/static/',
  });

  app.use(cookieParser(cookieSecret));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (corsOrigins!.includes('*') || corsOrigins!.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Access-Token',
      'Cache-Control',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  });

  app.setGlobalPrefix(apiPrefix!);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: errors => {
        const errorMessages = {};
        errors.forEach(error => {
          errorMessages[error.property] = Object.values(error.constraints || {});
        });
        return {
          message: 'Validation failed',
          errors: errorMessages,
          statusCode: 400,
        };
      },
    }),
  );

  app.useGlobalFilters(new ValidationExceptionFilter(), new AllExceptionsFilter());

  app.useGlobalInterceptors(new LoggingInterceptor(), new SanitizeInterceptor());

  // Global guards (JWT auth by default, use @Public() to skip)
  //   const jwtAuthGuard = app.get(JwtAuthGuard);
  //   app.useGlobalGuards(jwtAuthGuard);

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('LMS AI Backend API')
      .setDescription('AI-Powered Learning Management System Backend API Documentation')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addCookieAuth('access-token', {
        type: 'apiKey',
        in: 'cookie',
        name: 'access-token',
        description: 'Access token cookie',
      })
      .addServer(`http://localhost:${port}`)
      .addServer(`https://localhost:${port}`)
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha', // Sắp xếp các nhóm API (controller) và các API (endpoint) theo thứ tự bảng chữ cái, giúp giao diện gọn gàng, chuyên nghiệp hơn.
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'LMS AI API Documentation', // Tùy chỉnh tiêu đề trên tab của trình duyệt.
    });

    logger.log(
      `📚 Swagger documentation: ${httpsOptions ? 'https' : 'http'}://localhost:${port}/${apiPrefix}/docs`,
    );
  }

  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    logger.error('Uncaught Exception:' + error.stack);
    process.exit(1);
  });

  // Promise bị reject mà không catch
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at' + promise + 'reason:' + reason);
    process.exit(1);
  });

  //   const server = await app.listen(port!);
  //   server.setTimeout(30000);
  const server = await app.listen(port!, '0.0.0.0');
  server.keepAliveTimeout = configService.get<number>(
    'production.performance.keepAliveTimeout',
    65000,
  );
  server.headersTimeout = configService.get<number>('production.performance.headersTimeout', 66000);

  // Graceful shutdown
  process.on('SIGINT', () => gracefulShutdown(app, 'SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown(app, 'SIGTERM'));

  const protocol = httpsOptions ? 'https' : 'http';
  logger.log(`🚀 Application is running on: ${protocol}://localhost:${port}/${apiPrefix}`);
  logger.log(`🔐 Security features: ${httpsOptions ? 'HTTPS ✅' : 'HTTP ⚠️'}`);
  logger.log(`🛡️ Security middleware: Helmet ✅, CORS ✅, Rate Limiting ✅`);
}

async function gracefulShutdown(app: NestExpressApplication, signal: string) {
  const logger = new Logger('GracefulShutdown');
  logger.log(`Received ${signal}. Starting graceful shutdown...`);

  const configService = app.get(ConfigService);
  const shutdownTimeout = configService.get<number>('production.gracefulShutdown.timeout', 15000);

  try {
    await app.close();
    logger.log('Application closed successfully');
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
  }

  setTimeout(() => {
    logger.error('Graceful shutdown timeout reached. Forcing exit...');
    process.exit(1);
  }, shutdownTimeout);
}

function startInClusterMode() {
  const configService = new ConfigService();
  const numWorkers = configService.get<number>('production.cluster.workers') || os.cpus().length;

  if (cluster.isPrimary) {
    console.log(`Master process ${process.pid} is running`);

    for (let i = 0; i < numWorkers; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
      console.log('Starting a new worker');
      cluster.fork();
    });
  } else {
    bootstrap();
    console.log(`Worker process ${process.pid} started`);
  }
}

if (process.env.CLUSTER_ENABLED === 'true') {
  startInClusterMode();
} else {
  bootstrap();
}

// bootstrap().catch(err => {
//   console.error('Error starting application:', err);
//   process.exit(1);
// });
