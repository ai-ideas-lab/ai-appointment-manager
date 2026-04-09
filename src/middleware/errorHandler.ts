/**
 * 错误处理中间件
 * 统一处理应用中的错误
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, LogLevel } from '../types';
import { logger } from '../utils';

/**
 * 自定义错误类
 */
export class CustomError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  
  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * API 错误
 */
export class ApiError extends CustomError {
  constructor(message: string, statusCode: number = 400) {
    super('API_ERROR', message, statusCode);
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication failed') {
    super('AUTHENTICATION_ERROR', message, 401);
  }
}

/**
 * 授权错误
 */
export class AuthorizationError extends CustomError {
  constructor(message: string = 'Access denied') {
    super('AUTHORIZATION_ERROR', message, 403);
  }
}

/**
 * 验证错误
 */
export class ValidationError extends CustomError {
  constructor(message: string = 'Validation failed') {
    super('VALIDATION_ERROR', message, 400);
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404);
  }
}

/**
 * 数据库错误
 */
export class DatabaseError extends CustomError {
  constructor(message: string = 'Database operation failed') {
    super('DATABASE_ERROR', message, 500);
  }
}

/**
 * 外部服务错误
 */
export class ExternalServiceError extends CustomError {
  constructor(service: string, message: string) {
    super(`EXTERNAL_SERVICE_${service.toUpperCase()}_ERROR`, message, 502);
  }
}

/**
 * 异步路由处理器类型
 */
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * 异步错误处理包装器
 * 自动捕获 async 路由中的异常并传递给错误处理中间件
 */
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 错误处理中间件
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let { statusCode = 500, code = 'INTERNAL_ERROR', message } = err;
  
  // 记录错误日志
  if (err instanceof CustomError) {
    logger.error(`${code}: ${message}`, {
      error: err,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
  } else {
    logger.error('Unexpected error', {
      error: err,
      stack: err.stack,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
  }
  
  // 开发环境返回详细错误信息
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    success: false,
    error: {
      code,
      message: isDevelopment ? message : 'Internal server error',
      ...(isDevelopment && { stack: err.stack }),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  };
  
  // 发送错误响应
  res.status(statusCode).json(errorResponse);
}

/**
 * 全局错误处理（用于未捕获的异常）
 */
export function setupGlobalErrorHandlers(): void {
  // 未捕获的 Promise 异常
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', {
      promise,
      reason,
      timestamp: new Date().toISOString(),
    });
    
    // 在生产环境中优雅地关闭
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
  
  // 未捕获的异常
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      error,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    // 在生产环境中优雅地关闭
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
  
  // 进程信号处理
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
}

/**
 * 错误工厂函数
 */
export class ErrorFactory {
  static createError(type: string, message?: string, statusCode?: number): CustomError {
    switch (type) {
      case 'AUTHENTICATION':
        return new AuthenticationError(message);
      case 'AUTHORIZATION':
        return new AuthorizationError(message);
      case 'VALIDATION':
        return new ValidationError(message);
      case 'NOT_FOUND':
        return new NotFoundError(message);
      case 'DATABASE':
        return new DatabaseError(message);
      case 'EXTERNAL_SERVICE':
        return new ExternalServiceError(message || 'unknown', message);
      default:
        return new CustomError(type, message || 'An error occurred', statusCode);
    }
  }
}

/**
 * 错误转换中间件
 * 将特定类型的错误转换为标准错误格式
 */
export function errorConverter(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 如果错误已经被转换为自定义错误，直接传递给错误处理中间件
  if (err instanceof CustomError) {
    return next(err);
  }
  
  // 将特定类型的错误转换为自定义错误
  let convertedError: CustomError;
  
  if (err.name === 'ValidationError') {
    convertedError = new ValidationError(err.message);
  } else if (err.name === 'JsonWebTokenError') {
    convertedError = new AuthenticationError('Invalid token');
  } else if (err.name === 'TokenExpiredError') {
    convertedError = new AuthenticationError('Token expired');
  } else if (err.name === 'MulterError') {
    convertedError = new ApiError('File upload error', 400);
  } else if (err.name === 'PrismaClientKnownRequestError') {
    // Prisma 特定错误处理
    convertedError = new DatabaseError(err.message);
  } else if (err.name === 'PrismaClientValidationError') {
    convertedError = new ValidationError('Invalid data provided');
  } else {
    // 未知错误
    convertedError = new CustomError('INTERNAL_ERROR', err.message, 500);
  }
  
  next(convertedError);
}