/**
 * Metrics Middleware
 *
 * Collects API performance metrics
 */

import type { Context, Next } from 'hono';

interface MetricData {
  path: string;
  method: string;
  status: number;
  duration: number;
  timestamp: number;
}

// In-memory metrics store (use proper observability platform in production)
const metrics: MetricData[] = [];
const MAX_METRICS = 1000;

export const metricsMiddleware = () => {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const path = c.req.path;
    const method = c.req.method;

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    // Store metric
    metrics.push({
      path,
      method,
      status,
      duration,
      timestamp: start,
    });

    // Keep only recent metrics
    if (metrics.length > MAX_METRICS) {
      metrics.shift();
    }

    // Add performance headers
    c.header('X-Response-Time', `${duration}ms`);
  };
};

export const getMetrics = () => {
  const now = Date.now();
  const last5min = metrics.filter((m) => now - m.timestamp < 5 * 60 * 1000);

  return {
    total: metrics.length,
    last5min: last5min.length,
    avgDuration: last5min.reduce((sum, m) => sum + m.duration, 0) / last5min.length || 0,
    errorRate: (last5min.filter((m) => m.status >= 400).length / last5min.length) * 100 || 0,
  };
};
