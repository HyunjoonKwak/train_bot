import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? '서버 오류가 발생했습니다.' : err.message,
  });
}
