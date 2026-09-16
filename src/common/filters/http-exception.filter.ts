import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

/**
 * Global Exception Filter to ensure all API errors follow a consistent JSON format.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error', statusCode: status };

    // Handle TypeORM Database Errors specifically
    if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST; // Or CONFLICT depending on the error
      const driverError = (exception as any).driverError;
      message = {
        message: 'Database operation failed: An integrity constraint or data format issue occurred.',
        detail: exception.message,
        hint: 'Check for duplicate entries or missing required fields.',
        code: (exception as any).code || driverError?.code,
        statusCode: status
      };
    }

    // Log the error for internal tracking
    console.error(`[Error] ${request.method} ${request.url}`, exception);

    const isDevelopment = process.env.NODE_ENV === 'development';

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: typeof message === 'string' ? { message } : message,
      // Provide stack trace only in development
      stack: isDevelopment ? (exception instanceof Error ? exception.stack : null) : undefined,
    });
  }
}
