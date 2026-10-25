import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/errors.js';

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors
    });
  }

  if (err instanceof Error) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Unknown error.'
  });
}
