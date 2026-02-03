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
  keyGenerator?: (c: Context) => string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

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
  if (!match) throw new Error(`Invalid window format: ${window}`);

  const [, amount, unit] = match;
  const multipliers = { m: 60, h: 3600, d: 86400 };
  return parseInt(amount) * multipliers[unit as keyof typeof multipliers] * 1000;
};

export const rateLimiter = (options: RateLimitOptions) => {
  const windowMs = parseWindow(options.window);

  return async (c: Context, next: Next) => {
    const identifier = options.keyGenerator
      ? options.keyGenerator(c)
      : c.req.header('X-Forwarded-For') || 'anonymous';

    const now = Date.now();
    const record = store.get(identifier);

    // Initialize or reset if window expired
    if (!record || record.resetAt < now) {
      store.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      });

      c.header('X-RateLimit-Limit', options.max.toString());
      c.header('X-RateLimit-Remaining', (options.max - 1).toString());
      c.header('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      return next();
    }

    // Check if limit exceeded
    if (record.count >= options.max) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);

      c.header('X-RateLimit-Limit', options.max.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', new Date(record.resetAt).toISOString());
      c.header('Retry-After', retryAfter.toString());

      return c.json(
        {
          error: 'Rate limit exceeded',
          message: `Maximum ${options.max} requests per ${options.window}`,
          retryAfter: retryAfter,
        },
        429,
      );
    }

    // Increment counter
    record.count++;
    store.set(identifier, record);

    c.header('X-RateLimit-Limit', options.max.toString());
    c.header('X-RateLimit-Remaining', (options.max - record.count).toString());
    c.header('X-RateLimit-Reset', new Date(record.resetAt).toISOString());

    return next();
  };
};
