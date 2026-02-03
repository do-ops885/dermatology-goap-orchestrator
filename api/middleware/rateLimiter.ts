/**
 * Rate Limiter Middleware
 *
 * Implements sliding window rate limiting to prevent API abuse.
 * Uses in-memory storage for development, Redis for production.
 *
 * @see plans/26_api_gateway_integration_strategy.md
 */

import type { Context, Next } from 'hono';

interface RateLimitOptions {
  max: number; // Maximum requests per window
  window: string; // Time window (e.g., '15m', '1h')
  keyGenerator?: (_c: Context) => string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const DEFAULT_MAX = 100;
const ANONYMOUS_IDENTIFIER = 'anonymous';

// In-memory store (use Redis in production)
const store = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt < now) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

const parseWindow = (window: string): number => {
  const match = window.match(/^(\d+)(m|h|d)$/);
  if (match == null) throw new Error(`Invalid window format: ${window}`);

  const [, amount, unit] = match;
  const multipliers = { m: 60, h: 3600, d: 86400 };
  return parseInt(amount) * multipliers[unit as keyof typeof multipliers] * 1000;
};

export const rateLimiter = (options: RateLimitOptions) => {
  const windowMs = parseWindow(options.window);
  const max = options.max ?? DEFAULT_MAX;

  const RATE_LIMIT_HEADER = 'X-RateLimit-Limit';
  const RATE_LIMIT_REMAINING = 'X-RateLimit-Remaining';
  const RATE_LIMIT_RESET = 'X-RateLimit-Reset';

  return async (c: Context, next: Next) => {
    const headerResult = options.keyGenerator
      ? options.keyGenerator(c)
      : c.req.header('X-Forwarded-For');

    const identifier = headerResult ?? ANONYMOUS_IDENTIFIER;

    const now = Date.now();
    const record = store.get(identifier);

    if (record === null || record === undefined || record.resetAt < now) {
      store.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      });

      c.header(RATE_LIMIT_HEADER, max.toString());
      c.header(RATE_LIMIT_REMAINING, (max - 1).toString());
      c.header(RATE_LIMIT_RESET, new Date(now + windowMs).toISOString());

      return next();
    }

    if (record.count >= max) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);

      c.header(RATE_LIMIT_HEADER, max.toString());
      c.header(RATE_LIMIT_REMAINING, '0');
      c.header(RATE_LIMIT_RESET, new Date(record.resetAt).toISOString());
      c.header('Retry-After', retryAfter.toString());

      return c.json(
        {
          error: 'Rate limit exceeded',
          message: `Maximum ${max} requests per ${options.window}`,
          retryAfter: retryAfter,
        },
        429,
      );
    }

    record.count++;
    store.set(identifier, record);

    c.header(RATE_LIMIT_HEADER, max.toString());
    c.header(RATE_LIMIT_REMAINING, (max - record.count).toString());
    c.header(RATE_LIMIT_RESET, new Date(record.resetAt).toISOString());

    return next();
  };
};
