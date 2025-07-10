import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException) //  (lỗi 400) chính là loại exception mà ValidationPipe của NestJS ném
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    console.log('Herrrrrrrrrrrrrrrrrrrrrrr - ValidationExceptionFilter');
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus(); // lấy mã trạng thái (sẽ là 400)
    const exceptionResponse = exception.getResponse(); // lấy nội dung lỗi gốc

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: 'Validation failed',
      errors: this.extractValidationErrors(exceptionResponse),
    };

    response.status(status).json(errorResponse);
  }

  //   Nếu exceptionResponse.message là một mảng (trường hợp phổ biến nhất), nó sẽ trả về chính mảng đó.
  //   Nếu exceptionResponse.message chỉ là một chuỗi đơn lẻ, nó sẽ bọc chuỗi đó vào trong một mảng để đảm bảo đầu ra luôn nhất quán.
  //   Nếu không thể tìm thấy, nó sẽ trả về một mpeg mặc định
  private extractValidationErrors(exceptionResponse: any): any {
    if (typeof exceptionResponse === 'object' && exceptionResponse.message) {
      if (Array.isArray(exceptionResponse.message)) {
        return exceptionResponse.message;
      }
      return [exceptionResponse.message];
    }
    return ['Validation error occurred'];
  }
}
