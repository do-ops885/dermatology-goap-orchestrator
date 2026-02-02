import { Logger } from './logger';

/**
 * Memory monitoring thresholds
 */
const MEMORY_THRESHOLDS = {
  WARNING_RATIO: 0.8,
  CRITICAL_RATIO: 0.9,
  CHECK_INTERVAL_MS: 30000,
} as const;

/**
 * Memory statistics snapshot
 */
export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedRatio: number;
  timestamp: number;
}

/**
 * Memory monitoring service
 * Tracks JS heap usage and alerts when thresholds are exceeded
 */
export class MemoryMonitor {
  private intervalId: number | null = null;
  private lastStats: MemoryStats | null = null;
  private listeners: Set<(_stats: MemoryStats) => void> = new Set();

  /**
   * Start monitoring memory usage
   * @param intervalMs Check interval in milliseconds (default: 30000)
   */
  public start(intervalMs: number = MEMORY_THRESHOLDS.CHECK_INTERVAL_MS): void {
    if (this.intervalId !== null) {
      Logger.warn('MemoryMonitor', 'already_started', { intervalMs });
      return;
    }

    Logger.info('MemoryMonitor', 'starting', { intervalMs });

    // Check immediately
    this.checkMemory();

    // Start periodic checks
    this.intervalId = window.setInterval(() => {
      this.checkMemory();
    }, intervalMs);
  }

  /**
   * Stop monitoring memory usage
   */
  public stop(): void {
    if (this.intervalId === null) {
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;
    Logger.info('MemoryMonitor', 'stopped');
  }

  /**
   * Check memory usage and log if thresholds exceeded
   */
  private checkMemory(): void {
    const stats = this.getCurrentStats();

    if (!stats) {
      return;
    }

    this.lastStats = stats;

    // Notify listeners
    this.notifyListeners(stats);

    // Check warning threshold
    if (stats.usedRatio >= MEMORY_THRESHOLDS.WARNING_RATIO) {
      Logger.warn('MemoryMonitor', 'warning_threshold', {
        usedRatio: stats.usedRatio,
        usedMB: this.bytesToMB(stats.usedJSHeapSize),
        limitMB: this.bytesToMB(stats.jsHeapSizeLimit),
        threshold: MEMORY_THRESHOLDS.WARNING_RATIO,
      });
    }

    // Check critical threshold
    if (stats.usedRatio >= MEMORY_THRESHOLDS.CRITICAL_RATIO) {
      Logger.error('MemoryMonitor', 'critical_threshold', {
        usedRatio: stats.usedRatio,
        usedMB: this.bytesToMB(stats.usedJSHeapSize),
        limitMB: this.bytesToMB(stats.jsHeapSizeLimit),
        threshold: MEMORY_THRESHOLDS.CRITICAL_RATIO,
      });
    }
  }

  /**
   * Get current memory statistics
   */
  public getCurrentStats(): MemoryStats | null {
    if (!this.isMemoryAPIAvailable()) {
      return null;
    }

    const memory = (
      performance as {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
      }
    ).memory;
    if (!memory) {
      return null;
    }

    const used = memory.usedJSHeapSize;
    const total = memory.totalJSHeapSize;
    const limit = memory.jsHeapSizeLimit;
    const usedRatio = limit > 0 ? used / limit : 0;

    return {
      usedJSHeapSize: used,
      totalJSHeapSize: total,
      jsHeapSizeLimit: limit,
      usedRatio,
      timestamp: Date.now(),
    };
  }

  /**
   * Get last memory statistics snapshot
   */
  public getLastStats(): MemoryStats | null {
    return this.lastStats;
  }

  /**
   * Add listener for memory statistics updates
   * @returns Unsubscribe function
   */
  public addListener(listener: (_stats: MemoryStats) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Remove all listeners
   */
  public removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Check if memory API is available in current browser
   */
  private isMemoryAPIAvailable(): boolean {
    return typeof performance !== 'undefined' && 'memory' in performance;
  }

  /**
   * Notify all listeners with current stats
   */
  private notifyListeners(stats: MemoryStats): void {
    for (const listener of this.listeners) {
      try {
        listener(stats);
      } catch (error) {
        Logger.error('MemoryMonitor', 'listener_error', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Convert bytes to megabytes
   */
  private bytesToMB(bytes: number): number {
    return bytes / (1024 * 1024);
  }
}

/**
 * Global memory monitor instance
 */
export const globalMemoryMonitor = new MemoryMonitor();

/**
 * Start memory monitoring in production
 */
export const startMemoryMonitoring = (intervalMs?: number): void => {
  if (import.meta.env.PROD) {
    globalMemoryMonitor.start(intervalMs);
  }
};

/**
 * Get current memory statistics
 */
export const getMemoryStats = (): MemoryStats | null => {
  return globalMemoryMonitor.getCurrentStats();
};

/**
 * Check if memory usage is within safe limits
 */
export const isMemorySafe = (): boolean => {
  const stats = getMemoryStats();
  if (!stats) {
    return true;
  }
  return stats.usedRatio < MEMORY_THRESHOLDS.WARNING_RATIO;
};
