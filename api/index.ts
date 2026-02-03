declare const process: { env?: { [key: string]: string | undefined } };
/**

declare const process: { env?: { [key: string]: string | undefined } };
 * API Gateway - Main Entry Point
 * 
 * Backend-for-Frontend pattern using Hono + Vercel Edge Functions
 * Handles all external API calls (Gemini, Search) with rate limiting,
 * caching, and retry logic.
 * 
 * @see plans/26_api_gateway_integration_strategy.md
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware } from './middleware/metrics';

// Route handlers
import geminiRoutes from './routes/gemini';
import searchRoutes from './routes/search';
import healthRoutes from './routes/health';

const app = new Hono();

// Global middleware
app.use('*', cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://app.dermatology-ai.app', 'https://dermatology-ai.app']
    : '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-User-ID'],
  exposeHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
  credentials: true,
}));

app.use('*', logger());
app.use('*', metricsMiddleware());
app.use('*', errorHandler());

// Rate limiting for API routes (not health check)
app.use('/api/*', rateLimiter({ 
  max: 100, 
  window: '15m',
  keyGenerator: (c) => {
    return c.req.header('X-User-ID') || 
           c.req.header('X-Forwarded-For') || 
           c.req.header('CF-Connecting-IP') ||
           'anonymous';
  }
}));

// Routes
app.route('/health', healthRoutes);
app.route('/api/gemini', geminiRoutes);
app.route('/api/search', searchRoutes);

// Root endpoint
app.get('/', (c) => {
  return c.json({ 
    service: 'Dermatology AI API Gateway',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      gemini: '/api/gemini/*',
      search: '/api/search/*',
    }
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

export default app;
