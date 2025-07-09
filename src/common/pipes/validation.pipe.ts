import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  Type,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  constructor(private readonly logger: WinstonService) {
    this.logger.setContext(ValidationPipe.name);
  }

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // plainToClass sẽ lấy dữ liệu thô value và biến nó thành một instance thực sự của class metatype.
    const object = plainToClass(metatype, value);
    const errors = await validate(object, {
      whitelist: true, // Hãy tự động loại bỏ chúng nếu không có.
      forbidNonWhitelisted: true, // Cấm những gì không có trong danh sách, báo lỗi
      transform: true, //  Cho phép class-validator tự động biến đổi kiểu dữ liệu nếu có thể
      skipMissingProperties: false, // Các property không có trong object (bị thiếu) sẽ không bị kiểm tra.
    });

    if (errors.length > 0) {
      const errorMessages = this.formatErrors(errors);
      this.logger.warn(`Validation failed: ${JSON.stringify(errorMessages)}`);

      throw new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
      });
    }

    return object;
  }

  private toValidate(metatype: Type<any>): boolean {
    const types: Type<any>[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: any[]): any {
    return errors.reduce((acc, error) => {
      const property = error.property;
      const constraints = error.constraints;

      acc[property] = Object.values(constraints);

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        acc[property] = this.formatErrors(error.children);
      }

      return acc;
    }, {});
  }
}
