import { Request, Response, NextFunction } from 'express';
import { redis } from '../../config/redis';
import { AppError } from './error.middleware';

interface RateLimitOptions {
  windowSecs:  number;
  maxRequests: number;
  keyPrefix:   string;
}

export function createRateLimit({ windowSecs, maxRequests, keyPrefix }: RateLimitOptions) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.user?.id ?? req.ip;
    const key    = `rl:${keyPrefix}:${userId}`;

    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSecs);

      if (count > maxRequests) {
        const ttl = await redis.ttl(key);
        throw new AppError(
          429,
          `Límite de solicitudes excedido. Intentá de nuevo en ${ttl} segundos.`,
          'RATE_LIMIT_EXCEEDED',
        );
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      // Redis unavailable — fail open to avoid blocking legitimate requests
    }

    next();
  };
}
