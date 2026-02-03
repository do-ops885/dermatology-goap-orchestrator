/**
 * Performance Monitoring Service
 *
 * Tracks Web Vitals and custom performance metrics.
 * Integrates with existing reportWebVitals.ts
 *
 * @see plans/24_performance_optimization_strategy.md
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';

import { Logger } from './logger';

interface PerformanceMetrics {
  CLS?: Metric;
  FID?: Metric;
  FCP?: Metric;
  LCP?: Metric;
  TTFB?: Metric;
  INP?: Metric;
}

interface CustomMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {};
  private customMetrics: CustomMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();

  private constructor() {
    this.initializeWebVitals();
    this.initializeResourceTiming();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private initializeWebVitals(): void {
    const handleMetric = (metric: Metric) => {
      this.metrics[metric.name as keyof PerformanceMetrics] = metric;

      // Log metric
      Logger.info('PerformanceMonitor', `${metric.name} recorded`, {
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
      });

      // Send to analytics (if available)
      this.sendToAnalytics(metric);

      // Check against thresholds
      this.checkThresholds(metric);
    };

    // Register all Web Vitals
    onCLS(handleMetric);
    onFID(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);

    // INP is newer, may not be available in all browsers
    try {
      onINP(handleMetric);
    } catch {
      Logger.warn('PerformanceMonitor', 'INP metric not available');
    }
  }

  /**
   * Initialize resource timing observer
   */
  private initializeResourceTiming(): void {
    if (!('PerformanceObserver' in window)) {
      Logger.warn('PerformanceMonitor', 'PerformanceObserver not supported');
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;

            // Track slow resources (> 1s)
            if (resourceEntry.duration > 1000) {
              Logger.warn('PerformanceMonitor', 'Slow resource detected', {
                name: resourceEntry.name,
                duration: resourceEntry.duration,
                type: resourceEntry.initiatorType,
              });
            }
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    } catch (error) {
      Logger.error('PerformanceMonitor', 'Failed to setup resource timing', { error });
    }
  }

  /**
   * Track custom performance metric
   */
  trackCustomMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: CustomMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.customMetrics.push(metric);

    // Keep only last 100 metrics
    if (this.customMetrics.length > 100) {
      this.customMetrics.shift();
    }

    Logger.info('PerformanceMonitor', `Custom metric: ${name}`, { value, tags });
  }

  /**
   * Track component render time
   */
  trackComponentRender(componentName: string, duration: number): void {
    this.trackCustomMetric('component_render', duration, { component: componentName });

    // Warn if render takes too long
    if (duration > 16) {
      // More than 1 frame at 60fps
      Logger.warn('PerformanceMonitor', `Slow render detected: ${componentName}`, { duration });
    }
  }

  /**
   * Track API call performance
   */
  trackAPICall(endpoint: string, duration: number, status: number): void {
    this.trackCustomMetric('api_call', duration, {
      endpoint,
      status: status.toString(),
    });
  }

  /**
   * Track ML inference time
   */
  trackInference(model: string, duration: number): void {
    this.trackCustomMetric('ml_inference', duration, { model });

    if (duration > 5000) {
      Logger.warn('PerformanceMonitor', `Slow inference: ${model}`, { duration });
    }
  }

  /**
   * Get current Web Vitals metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get custom metrics
   */
  getCustomMetrics(): CustomMetric[] {
    return [...this.customMetrics];
  }

  /**
   * Get metrics summary
   */
  getSummary(): {
    webVitals: PerformanceMetrics;
    customMetrics: {
      componentRenders: number;
      avgRenderTime: number;
      apiCalls: number;
      avgAPITime: number;
      inferences: number;
      avgInferenceTime: number;
    };
  } {
    const componentRenders = this.customMetrics.filter((m) => m.name === 'component_render');
    const apiCalls = this.customMetrics.filter((m) => m.name === 'api_call');
    const inferences = this.customMetrics.filter((m) => m.name === 'ml_inference');

    return {
      webVitals: this.getMetrics(),
      customMetrics: {
        componentRenders: componentRenders.length,
        avgRenderTime:
          componentRenders.reduce((sum, m) => sum + m.value, 0) / componentRenders.length || 0,
        apiCalls: apiCalls.length,
        avgAPITime: apiCalls.reduce((sum, m) => sum + m.value, 0) / apiCalls.length || 0,
        inferences: inferences.length,
        avgInferenceTime: inferences.reduce((sum, m) => sum + m.value, 0) / inferences.length || 0,
      },
    };
  }

  /**
   * Send metric to analytics
   */
  private sendToAnalytics(metric: Metric): void {
    // Use sendBeacon for reliability (survives page unload)
    if ('sendBeacon' in navigator) {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        timestamp: Date.now(),
      });

      try {
        navigator.sendBeacon('/api/analytics/vitals', body);
      } catch (error) {
        Logger.warn('PerformanceMonitor', 'Failed to send analytics', { error });
      }
    }
  }

  /**
   * Check metric against thresholds
   */
  private checkThresholds(metric: Metric): void {
    const thresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 },
      INP: { good: 200, poor: 500 },
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (!threshold) return;

    if (metric.value > threshold.poor) {
      Logger.error('PerformanceMonitor', `Poor ${metric.name} detected`, {
        value: metric.value,
        threshold: threshold.poor,
      });
    } else if (metric.value > threshold.good) {
      Logger.warn('PerformanceMonitor', `${metric.name} needs improvement`, {
        value: metric.value,
        threshold: threshold.good,
      });
    }
  }

  /**
   * Export metrics for debugging
   */
  exportMetrics(): string {
    return JSON.stringify(
      {
        webVitals: this.metrics,
        customMetrics: this.customMetrics,
        summary: this.getSummary(),
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.metrics = {};
    this.customMetrics = [];
  }

  /**
   * Cleanup observers
   */
  dispose(): void {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Helper function to measure async operations
export const measureAsync = async <T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>,
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    performanceMonitor.trackCustomMetric(name, duration, tags);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.trackCustomMetric(name, duration, { ...tags, error: 'true' });
    throw error;
  }
};

// Helper function to measure sync operations
export const measureSync = <T>(name: string, fn: () => T, tags?: Record<string, string>): T => {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    performanceMonitor.trackCustomMetric(name, duration, tags);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.trackCustomMetric(name, duration, { ...tags, error: 'true' });
    throw error;
  }
};

// React hook for performance tracking
export const usePerformanceTracking = (componentName: string) => {
  const start = performance.now();

  return () => {
    const duration = performance.now() - start;
    performanceMonitor.trackComponentRender(componentName, duration);
  };
};
