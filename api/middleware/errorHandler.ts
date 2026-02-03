/**
 * Error Handler Middleware
 *
 * Catches and formats all errors with proper logging
 */

import type { Context, Next } from 'hono';

export const errorHandler = () => {
  return async (c: Context, next: Next) => {
    try {
      return await next();
    } catch (error) {
      console.warn('[API Error]', {
        path: c.req.path,
        method: c.req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      const message = getErrorMessage(error);
      const status = getStatusCode(error);

      return c.json(
        {
          success: false,
          error: message,
          details:
            globalThis.process?.env?.NODE_ENV === 'development' && error instanceof Error
              ? error.message
              : undefined,
        },
        status,
      );
    }
  };
};

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Internal server error';

  if (error.message.includes('rate limit')) return 'Rate limit exceeded';
  if (error.message.includes('unauthorized')) return 'Unauthorized';
  if (error.message.includes('not found')) return 'Not found';
  if (error.message.includes('validation')) return 'Bad request';

  return 'Internal server error';
}

function getStatusCode(error: unknown): 400 | 401 | 404 | 429 | 500 {
  if (!(error instanceof Error)) return 500;

  if (error.message.includes('rate limit')) return 429;
  if (error.message.includes('unauthorized')) return 401;
  if (error.message.includes('not found')) return 404;
  if (error.message.includes('validation')) return 400;

  return 500;
}
