import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import { WinstonModule } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import { AllExceptionsFilter } from 'common/filters/http-exception.filter';
import { ValidationExceptionFilter } from 'common/filters/validation-exception.filter';
import { LoggingInterceptor } from 'common/interceptors/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonLoggerService } from 'common/logger/winston-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const winstonlogger = app.get(WinstonLoggerService);
  winstonlogger.setContext('Bootstrap');
  app.useLogger(winstonlogger);

  winstonlogger.log('Application started');

  const configService = app.get(ConfigService);
  //   const logger = new Logger('Bootstrap');

  // Global configuration
  const port = configService.get<number>('app.port');
  const apiPrefix = configService.get<string>('app.apiPrefix');
  const corsOrigins = configService.get<string[]>('app.corsOrigins');

  // Security middleware
  if (configService.get<boolean>('security.helmet')) {
    app.use(helmet());
  }

  if (configService.get<boolean>('security.compression')) {
    app.use(compression());
  }

  // CORS configuration
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix!);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true, // nếu có field lạ ngoài DTO, ném lỗi luôn thay vì chỉ bỏ qua.
      transformOptions: {
        enableImplicitConversion: true, // cho phép chuyển đổi kiểu dữ liệu "ngầm" dựa trên loại trong DTO, mà không cần dùng @Type(() => ...) của class-transformer
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter(), new ValidationExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

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
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    winstonlogger.log(
      `Swagger documentation available at http://localhost:${port}/${apiPrefix}/docs`,
    );
  }

  // Graceful shutdown
  // Khi bạn nhấn Ctrl + C trong terminal
  process.on('SIGTERM', () => {
    winstonlogger.log('SIGTERM received, shutting down gracefully');
    app.close();
  });

  // Khi process bị kill (thường từ hệ điều hành, Docker, hoặc deploy system như Kubernetes)
  process.on('SIGINT', () => {
    winstonlogger.log('SIGINT received, shutting down gracefully');
    app.close();
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch(err => {
  console.error('Error starting application:', err);
  process.exit(1);
});
