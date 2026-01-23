import { onCLS, onINP, onLCP, onTTFB, onFCP } from 'web-vitals';

import { Logger } from './logger';

import type { Metric } from 'web-vitals';

/**
 * Performance Budget Thresholds
 * Based on Core Web Vitals benchmarks (2024)
 */
const PERFORMANCE_THRESHOLDS: Record<string, number> = {
  LCP: 2500, // Largest Contentful Paint: 2.5s
  FID: 100, // First Input Delay: 100ms
  CLS: 0.1, // Cumulative Layout Shift: 0.1
  INP: 200, // Interaction to Next Paint: 200ms
  TTFB: 800, // Time to First Byte: 800ms
  FCP: 1800, // First Contentful Paint: 1.8s
} as const;

const reportHandler = (metric: Metric) => {
  // Log to internal logger for observability
  Logger.log('debug', 'WebVitals', metric.name, {
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  });

  // Check performance budget and alert if exceeded
  checkPerformanceBudget(metric);

  // Example: Send to analytics endpoint (if configured)
  // const body = JSON.stringify(metric);
  // if (navigator.sendBeacon) {
  //   navigator.sendBeacon('/analytics', body);
  // }
};

/**
 * Check if metric exceeds performance budget and log warning
 */
const checkPerformanceBudget = (metric: Metric): void => {
  const threshold = PERFORMANCE_THRESHOLDS[metric.name];
  if (threshold === undefined) {
    return;
  }

  if (metric.value > threshold) {
    Logger.warn('PerformanceBudget', 'threshold_exceeded', {
      metric: metric.name,
      value: metric.value,
      threshold,
      rating: metric.rating,
      delta: metric.delta,
    });
  } else {
    Logger.info('PerformanceBudget', 'within_threshold', {
      metric: metric.name,
      value: metric.value,
      threshold,
      rating: metric.rating,
    });
  }
};

export const reportWebVitals = () => {
  onCLS(reportHandler);
  onINP(reportHandler);
  onLCP(reportHandler);
  onTTFB(reportHandler);
  onFCP(reportHandler);
};

/**
 * Get performance thresholds for external use
 */
export const getPerformanceThresholds = () => ({ ...PERFORMANCE_THRESHOLDS });

/**
 * Check if a metric value is within performance budget
 */
export const isWithinBudget = (metricName: string, value: number): boolean => {
  const threshold = PERFORMANCE_THRESHOLDS[metricName];
  return threshold !== undefined && value <= threshold;
};
