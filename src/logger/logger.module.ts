import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { WinstonLoggerService } from './winston-logger.service';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logLevel = configService.get<string>('logging.level', 'info');
        // const logFormat = configService.get<string>('logging.format', 'json');
        const logFilename = configService.get<string>('logging.filename', 'logs/app.log');
        const maxFiles = configService.get<number>('logging.maxFiles', 5);
        const maxSize = configService.get<string>('logging.maxSize', '20m');

        // Cấu hình custom levels để tương thích với NestJS
        const customLevels = {
          levels: {
            error: 0,
            warn: 1,
            // log: 2, // NestJS log level
            info: 2, // Winston info level
            debug: 3,
            verbose: 4,
          },
          colors: {
            error: 'red',
            warn: 'yellow',
            log: 'green',
            info: 'green',
            debug: 'blue',
            verbose: 'cyan',
          },
        };

        const transports: winston.transport[] = [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                return `${timestamp} [${context || 'Aplication'}] ${level}: ${message} ${
                  Object.keys(meta).length ? JSON.stringify(meta) : ''
                }`;
              }),
            ),
          }),
        ];

        if (process.env.NODE_ENV === 'production') {
          transports.push(
            new winston.transports.File({
              filename: logFilename,
              level: logLevel,
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
              ),
              maxFiles,
              maxsize: parseInt(maxSize!, 10),
            }),
          );
        }

        return {
          levels: customLevels.levels,
          level: logLevel,
          transports,
        };
      },
    }),
  ],
  controllers: [],
  providers: [
    {
      provide: WinstonLoggerService,
      useFactory: (winstonLogger: winston.Logger) => {
        return new WinstonLoggerService(winstonLogger);
      },
      inject: ['winston'],
    },
  ],
  exports: [WinstonModule, WinstonLoggerService],
})
export class LoggerModule {}
