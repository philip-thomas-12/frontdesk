import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);

  // Always log server errors so production failures are visible in platform logs,
  // but never leak internal details (Prisma/driver messages) to the client.
  if (statusCode >= 500) {
    console.error('Unhandled Server Error:', err);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const message =
    statusCode >= 500 && isProduction
      ? 'An unexpected internal server error occurred.'
      : err.message || 'An unexpected internal server error occurred.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

