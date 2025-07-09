import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule as WinstonModuleNest } from 'nest-winston';
import * as winston from 'winston';
import { WinstonService } from './winston.service';

@Module({
  imports: [
    WinstonModuleNest.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logLevel = configService.get<string>('logging.level', 'info');
        const logFilename = configService.get<string>('logging.filename', 'logs/app.log');
        const maxFiles = configService.get<number>('logging.maxFiles', 5);
        const maxSize = configService.get<string>('logging.maxSize', '20m');

        // Cấu hình custom levels để tương thích với NestJS
        const customLevels = {
          levels: {
            error: 0,
            warn: 1,
            info: 2,
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

        // các kênh ghi log
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
      provide: WinstonService,
      useFactory: (winstonLogger: winston.Logger) => {
        return new WinstonService(winstonLogger);
      },
      inject: ['winston'], // token đại diện cho thực thể logger Winston đã được cấu hình hoàn chỉnh từ WinstonModule.forRootAsync.
    },
  ],
  exports: [WinstonModuleNest, WinstonService],
})
export class WinstonModule {}
