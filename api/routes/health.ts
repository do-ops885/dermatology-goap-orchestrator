/**
 * Health Check Routes
 */

declare const process: { uptime?: () => number } | undefined;

import { Hono } from 'hono';

import { getMetrics } from '../middleware/metrics';

const health = new Hono();

health.get('/', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process?.uptime?.() ?? 0,
  });
});

health.get('/metrics', (c) => {
  return c.json({
    status: 'healthy',
    metrics: getMetrics(),
  });
});

export default health;
