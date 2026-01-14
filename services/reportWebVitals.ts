import { onCLS, onINP, onLCP, onTTFB, onFCP } from 'web-vitals';

import { Logger } from './logger';

import type { Metric } from 'web-vitals';

const reportHandler = (metric: Metric) => {
  // Log to internal logger for observability
  Logger.log('debug', 'WebVitals', metric.name, {
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id
  });

  // Example: Send to analytics endpoint (if configured)
  // const body = JSON.stringify(metric);
  // if (navigator.sendBeacon) {
  //   navigator.sendBeacon('/analytics', body);
  // }
};

export const reportWebVitals = () => {
  onCLS(reportHandler);
  onINP(reportHandler);
  onLCP(reportHandler);
  onTTFB(reportHandler);
  onFCP(reportHandler);
};