import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
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

async function bootstrap() {
  const httpsOptions = SSLConfig.getHttpsOptions();
  const app = await NestFactory.create(AppModule, { httpsOptions });

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

  // Security middleware
  if (securityHelmet) {
    app.use(
      helmet({
        // Này trình duyệt, khi hiển thị trang web của tôi, anh chỉ được phép tải và thực thi tài nguyên
        // từ những nguồn mà tôi đã phê duyệt trong danh sách này.
        // Bất kỳ thứ gì không có trong danh sách, hãy chặn lại và báo cáo cho tôi."
        contentSecurityPolicy: {
          // Các Chỉ Thị Cụ Thể
          directives: {
            defaultSrc: ["'self'"], // chỉ cho phép tài nguyên từ chính domain của trang web này
            scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline Cho phép thực thi mã JavaScript hoặc CSS được viết trực tiếp trong file HTML
            styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline Cho phép thực thi mã JavaScript hoặc CSS được viết trực tiếp trong file HTML
            imgSrc: ["'self'", 'data:', 'https:'], // Cho phép tải tài nguyên từ data: URI, Cho phép tải tài nguyên từ bất kỳ domain nào sử dụng giao thức HTTPS.
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"], // Cấm hoàn toàn việc nhúng các plugin cũ và không an toàn như Flash, Silverlight.
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"], // Cấm hoàn toàn trang web của bạn bị nhúng vào trong các thẻ <iframe> hoặc <frame> trên các trang khác
          },
        },
        crossOriginEmbedderPolicy: false, // Khi bật (true), nó yêu cầu tất cả các tài nguyên từ domain khác phải có một cơ chế cho phép đặc biệt (gọi là COEP) mới được nhúng vào trang của bạn.
      }),
    );
  }

  // Dùng thư viện compression (Express middleware) để nén dữ liệu HTTP response (thường là gzip hoặc Brotli).
  if (securityCompression) {
    app.use(compression());
  }

  // Cookie parser middleware
  app.use(cookieParser(cookieSecret));

  // CORS configuration
  app.enableCors({
    // origin domain của người đang muốn nhập cảnh (ví dụ: https://my-frontend.com). Giá trị này có thể là undefined!
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (corsOrigins!.includes('*') || corsOrigins!.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Việc bao gồm 'OPTIONS' là bắt buộc để các "cuộc gọi thăm dò" (preflight requests) có thể hoạt động.
    // "du khách" gửi hành lý (request), họ được phép đính kèm những loại "giấy tờ" (header) nào.
    allowedHeaders: [
      'Content-Type', // Cần thiết khi frontend gửi dữ liệu JSON (application/json)
      'Authorization', // Cực kỳ quan trọng. Nếu không có header này, frontend sẽ không thể gửi JWT token hay bất kỳ thông tin xác thực nào khác
      'X-Requested-With', // Dùng để chỉ ra request này được gửi bởi JavaScript (AJAX) chứ không phải form truyền thống.
      'X-Access-Token', // Header tùy chỉnh (custom) bạn tạo ra để gửi token hoặc dữ liệu xác thực
      'Cache-Control', // Điều khiển cách trình duyệt cache response (hoặc yêu cầu server phản hồi dữ liệu mới)
    ],
    credentials: true, // "Credentials" ở đây có thể là cookie hoặc HTTP authentication headers (như Authorization).
    optionsSuccessStatus: 200, // Tùy chọn này liên quan đến "cuộc gọi thăm dò" (preflight request) sử dụng phương thức OPTIONS.
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix!);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, //  (ví dụ chuỗi số "123" thành số 123), hãy tự động làm điều đó.
      whitelist: true, // loại bỏ những thuộc tính không có trong dto
      forbidNonWhitelisted: true, // Nếu phát hiện có thành phần thừa, không chỉ loại bỏ mà hãy từ chối toàn bộ lô hàng ngay lập tức (báo lỗi)
      transformOptions: {
        enableImplicitConversion: true, // Nếu anh thấy một giá trị là chuỗi, nhưng trong bản thiết kế (type hint ở controller) nó được khai báo là number hoặc boolean, hãy tự động và ngầm định chuyển đổi nó sang kiểu dữ liệu đúng.
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

  // Global filters
  app.useGlobalFilters(new ValidationExceptionFilter(), new AllExceptionsFilter());

  // Global interceptors
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

  // Graceful shutdown
  // Khi bạn nhấn Ctrl + C trong terminal
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });

  // Khi process bị kill (thường từ hệ điều hành, Docker, hoặc deploy system như Kubernetes)
  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });

  // Handle uncaught exceptions
  // Lỗi chưa try/catch
  process.on('uncaughtException', error => {
    logger.error('Uncaught Exception:' + error.stack);
    process.exit(1);
  });

  // Promise bị reject mà không catch
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at' + promise + 'reason:' + reason);
    process.exit(1);
  });

  //   await app.listen(process.env.PORT ?? 3000);
  const server = await app.listen(port!);

  server.setTimeout(30000); // 30 seconds

  const protocol = httpsOptions ? 'https' : 'http';
  logger.log(`🚀 Application is running on: ${protocol}://localhost:${port}/${apiPrefix}`);
  logger.log(`🔐 Security features: ${httpsOptions ? 'HTTPS ✅' : 'HTTP ⚠️'}`);
  logger.log(`🛡️ Security middleware: Helmet ✅, CORS ✅, Rate Limiting ✅`);
}

bootstrap().catch(err => {
  console.error('Error starting application:', err);
  process.exit(1);
});
