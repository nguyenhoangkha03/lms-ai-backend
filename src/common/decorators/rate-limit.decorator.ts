import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../guards/rate-limit.guard';

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

// Predefined rate limit decorators
export const ApiRateLimit = () =>
  RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    factors: ['ip'],
    standardHeaders: true,
  });

export const AuthRateLimit = () =>
  RateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Very restrictive for auth endpoints
    factors: ['ip'],
    standardHeaders: true,
    circuitBreaker: true,
  });

export const UploadRateLimit = () =>
  RateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    factors: ['ip', 'user'],
    algorithm: 'token-bucket',
  });

export const AiRateLimit = () =>
  RateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    factors: ['user'],
    adaptive: true,
    tier: 'free',
  });
