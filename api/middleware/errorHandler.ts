declare const process: { env?: { [key: string]: string | undefined } };
/**

declare const process: { env?: { [key: string]: string | undefined } };
 * Error Handler Middleware
 * 
 * Catches and formats all errors with proper logging
 */

import type { Context, Next } from 'hono';

export const errorHandler = () => {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error) {
      console.error('[API Error]', {
        path: c.req.path,
        method: c.req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Determine status code
      let status = 500;
      let message = 'Internal server error';

      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          status = 429;
          message = 'Rate limit exceeded';
        } else if (error.message.includes('unauthorized')) {
          status = 401;
          message = 'Unauthorized';
        } else if (error.message.includes('not found')) {
          status = 404;
          message = 'Not found';
        } else if (error.message.includes('validation')) {
          status = 400;
          message = 'Bad request';
        }
      }

      return c.json(
        {
          success: false,
          error: message,
          details:
            process.env.NODE_ENV === 'development' && error instanceof Error
              ? error.message
              : undefined,
        },
        status,
      );
    }
  };
};
