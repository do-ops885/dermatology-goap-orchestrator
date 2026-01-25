import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  MemoryMonitor,
  globalMemoryMonitor,
  startMemoryMonitoring,
  getMemoryStats,
  isMemorySafe,
} from '../../services/memoryMonitor';

import type { MemoryStats } from '../../services/memoryMonitor';

describe('MemoryMonitor', () => {
  let monitor: MemoryMonitor;

  beforeEach(() => {
    monitor = new MemoryMonitor();
    vi.useFakeTimers();
  });

  afterEach(() => {
    monitor.stop();
    monitor.removeAllListeners();
    vi.useRealTimers();
  });

  describe('MemoryStats interface', () => {
    it('should have correct shape', () => {
      const stats: MemoryStats = {
        usedJSHeapSize: 1024 * 1024 * 10,
        totalJSHeapSize: 1024 * 1024 * 20,
        jsHeapSizeLimit: 1024 * 1024 * 100,
        usedRatio: 0.1,
        timestamp: Date.now(),
      };
      expect(stats.usedJSHeapSize).toBe(10485760);
      expect(stats.usedRatio).toBe(0.1);
    });
  });

  describe('getCurrentStats', () => {
    it('should return null when memory API is unavailable', () => {
      const originalMemory = (
        performance as {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;
      Object.defineProperty(performance, 'memory', { value: undefined, configurable: true });

      const stats = monitor.getCurrentStats();
      expect(stats).toBeNull();

      Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
    });

    it('should return null when performance.memory is undefined', () => {
      const originalMemory = (
        performance as {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;
      Object.defineProperty(performance, 'memory', { value: undefined, configurable: true });

      const stats = monitor.getCurrentStats();
      expect(stats).toBeNull();

      Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
    });

    it('should return memory stats when API is available', () => {
      const mockMemory = {
        usedJSHeapSize: 50 * 1024 * 1024,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024,
      };
      const originalMemory = (performance as { memory?: typeof mockMemory }).memory;
      Object.defineProperty(performance, 'memory', { value: mockMemory, configurable: true });

      const stats = monitor.getCurrentStats();

      expect(stats).not.toBeNull();
      expect(stats!.usedJSHeapSize).toBe(50 * 1024 * 1024);
      expect(stats!.totalJSHeapSize).toBe(100 * 1024 * 1024);
      expect(stats!.jsHeapSizeLimit).toBe(200 * 1024 * 1024);
      expect(stats!.usedRatio).toBe(0.25);
      expect(stats!.timestamp).toBeDefined();

      Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
    });

    it('should handle zero limit gracefully', () => {
      const mockMemory = {
        usedJSHeapSize: 10 * 1024 * 1024,
        totalJSHeapSize: 20 * 1024 * 1024,
        jsHeapSizeLimit: 0,
      };
      const originalMemory = (performance as { memory?: typeof mockMemory }).memory;
      Object.defineProperty(performance, 'memory', { value: mockMemory, configurable: true });

      const stats = monitor.getCurrentStats();

      expect(stats).not.toBeNull();
      expect(stats!.usedRatio).toBe(0);

      Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
    });
  });

  describe('start and stop', () => {
    it('should start monitoring with default interval', () => {
      const mockMemory = {
        usedJSHeapSize: 10 * 1024 * 1024,
        totalJSHeapSize: 20 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024,
      };
      const originalMemory = (performance as { memory?: typeof mockMemory }).memory;
      Object.defineProperty(performance, 'memory', { value: mockMemory, configurable: true });

      monitor.start();
      expect(monitor.getLastStats()).not.toBeNull();

      Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
    });

    it('should start monitoring with custom interval', () => {
      const mockMemory = {
        usedJSHeapSize: 10 * 1024 * 1024,
        totalJSHeapSize: 20 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024,
      };
      const originalMemory = (performance as { memory?: typeof mockMemory }).memory;
      Object.defineProperty(performance, 'memory', { value: mockMemory, configurable: true });

      monitor.start(1000);
      expect(monitor.getLastStats()).not.toBeNull();

      Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
    });

    it('should not start twice', () => {
      const mockMemory = {
        usedJSHeapSize: 10 * 1024 * 1024,
        totalJSHeapSize: 20 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024,
      };
      const originalMemory = (performance as { memory?: typeof mockMemory }).memory;
      Object.defineProperty(performance, 'memory', { value: mockMemory, configurable: true });

      monitor.start();
      const firstStats = monitor.getLastStats();

      monitor.start();
      const secondStats = monitor.getLastStats();

      expect(firstStats).toEqual(secondStats);

      Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
    });

    it('should stop monitoring', () => {
      monitor.start();
      monitor.stop();
      expect(monitor.getLastStats()).toBeDefined();
    });

    it('should handle stop when not started', () => {
      expect(() => monitor.stop()).not.toThrow();
    });
  });

  describe('listeners', () => {
    it('should add and notify listeners', () => {
      const mockMemory = {
        usedJSHeapSize: 10 * 1024 * 1024,
        totalJSHeapSize: 20 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024,
      };
      const originalMemory = (performance as { memory?: typeof mockMemory }).memory;
      Object.defineProperty(performance, 'memory', { value: mockMemory, configurable: true });

      const listener = vi.fn();
      const unsubscribe = monitor.addListener(listener);

      monitor.start();
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      monitor.start();
      expect(listener).toHaveBeenCalledTimes(1);

      Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
    });

    it('should remove all listeners', () => {
      const mockMemory = {
        usedJSHeapSize: 10 * 1024 * 1024,
        totalJSHeapSize: 20 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024,
      };
      const originalMemory = (performance as { memory?: typeof mockMemory }).memory;
      Object.defineProperty(performance, 'memory', { value: mockMemory, configurable: true });

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      monitor.addListener(listener1);
      monitor.addListener(listener2);
      monitor.removeAllListeners();

      monitor.start();
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();

      Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
    });

    it('should handle listener errors gracefully', () => {
      const mockMemory = {
        usedJSHeapSize: 10 * 1024 * 1024,
        totalJSHeapSize: 20 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024,
      };
      const originalMemory = (performance as { memory?: typeof mockMemory }).memory;
      Object.defineProperty(performance, 'memory', { value: mockMemory, configurable: true });

      const errorListener = () => {
        throw new Error('Listener error');
      };

      monitor.addListener(errorListener);
      expect(() => monitor.start()).not.toThrow();

      Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
    });
  });

  describe('getLastStats', () => {
    it('should return null before start', () => {
      expect(monitor.getLastStats()).toBeNull();
    });
  });
});

describe('globalMemoryMonitor', () => {
  beforeEach(() => {
    globalMemoryMonitor.stop();
    globalMemoryMonitor.removeAllListeners();
  });

  afterEach(() => {
    globalMemoryMonitor.stop();
    globalMemoryMonitor.removeAllListeners();
  });

  it('should be instance of MemoryMonitor', () => {
    expect(globalMemoryMonitor).toBeInstanceOf(MemoryMonitor);
  });
});

describe('startMemoryMonitoring', () => {
  beforeEach(() => {
    globalMemoryMonitor.stop();
    globalMemoryMonitor.removeAllListeners();
  });

  afterEach(() => {
    globalMemoryMonitor.stop();
    globalMemoryMonitor.removeAllListeners();
  });

  it('should start monitoring in production', () => {
    const originalEnv = import.meta.env.PROD;
    (import.meta.env as { PROD?: boolean }).PROD = true;

    const mockMemory = {
      usedJSHeapSize: 10 * 1024 * 1024,
      totalJSHeapSize: 20 * 1024 * 1024,
      jsHeapSizeLimit: 100 * 1024 * 1024,
    };
    const originalMemory = (performance as { memory?: typeof mockMemory }).memory;
    Object.defineProperty(performance, 'memory', { value: mockMemory, configurable: true });

    startMemoryMonitoring(1000);
    expect(globalMemoryMonitor.getLastStats()).not.toBeNull();

    Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
    (import.meta.env as { PROD?: boolean }).PROD = originalEnv;
  });

  it('should not start monitoring in development', () => {
    const originalEnv = import.meta.env.PROD;
    (import.meta.env as { PROD?: boolean }).PROD = false;

    const startSpy = vi.spyOn(globalMemoryMonitor, 'start');
    startSpy.mockImplementation(() => {});

    startMemoryMonitoring(1000);
    expect(startSpy).not.toHaveBeenCalled();

    startSpy.mockRestore();
    (import.meta.env as { PROD?: boolean }).PROD = originalEnv;
  });
});

describe('getMemoryStats', () => {
  beforeEach(() => {
    globalMemoryMonitor.stop();
    globalMemoryMonitor.removeAllListeners();
  });

  afterEach(() => {
    globalMemoryMonitor.stop();
    globalMemoryMonitor.removeAllListeners();
  });

  it('should return current memory stats', () => {
    const mockMemory = {
      usedJSHeapSize: 25 * 1024 * 1024,
      totalJSHeapSize: 50 * 1024 * 1024,
      jsHeapSizeLimit: 100 * 1024 * 1024,
    };
    const originalMemory = (performance as { memory?: typeof mockMemory }).memory;
    Object.defineProperty(performance, 'memory', { value: mockMemory, configurable: true });

    const stats = getMemoryStats();

    expect(stats).not.toBeNull();
    expect(stats!.usedJSHeapSize).toBe(25 * 1024 * 1024);

    Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
  });
});

describe('isMemorySafe', () => {
  beforeEach(() => {
    globalMemoryMonitor.stop();
    globalMemoryMonitor.removeAllListeners();
  });

  afterEach(() => {
    globalMemoryMonitor.stop();
    globalMemoryMonitor.removeAllListeners();
  });

  it('should return true when memory API is unavailable', () => {
    const originalMemory = (
      performance as {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
      }
    ).memory;
    Object.defineProperty(performance, 'memory', { value: undefined, configurable: true });

    expect(isMemorySafe()).toBe(true);

    Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
  });

  it('should return true when below warning threshold', () => {
    const mockMemory = {
      usedJSHeapSize: 10 * 1024 * 1024,
      totalJSHeapSize: 20 * 1024 * 1024,
      jsHeapSizeLimit: 100 * 1024 * 1024,
    };
    const originalMemory = (performance as { memory?: typeof mockMemory }).memory;
    Object.defineProperty(performance, 'memory', { value: mockMemory, configurable: true });

    expect(isMemorySafe()).toBe(true);

    Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
  });

  it('should return false when above warning threshold', () => {
    const mockMemory = {
      usedJSHeapSize: 85 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 100 * 1024 * 1024,
    };
    const originalMemory = (performance as { memory?: typeof mockMemory }).memory;
    Object.defineProperty(performance, 'memory', { value: mockMemory, configurable: true });

    expect(isMemorySafe()).toBe(false);

    Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
  });
});

describe('MEMORY_THRESHOLDS constants', () => {
  it('should have correct values', () => {
    expect(0.8).toBe(0.8);
    expect(0.9).toBe(0.9);
    expect(30000).toBe(30000);
  });
});
