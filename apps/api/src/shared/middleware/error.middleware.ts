import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Zod validation error
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Datos inválidos',
        code:    'VALIDATION_ERROR',
        fields:  err.errors.map((e) => ({
          path:    e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Known application error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    });
  }

  // Unknown error
  console.error('[UNHANDLED ERROR]', err);
  return res.status(500).json({
    error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
  });
}
