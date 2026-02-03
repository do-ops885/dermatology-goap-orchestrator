/**
 * TensorFlow.js Memory Manager
 * 
 * Manages tensor lifecycle and memory cleanup to prevent memory leaks.
 * Implements tensor pooling for frequently used shapes.
 * 
 * @see plans/24_performance_optimization_strategy.md
 */

import * as tf from '@tensorflow/tfjs';
import { Logger } from './logger';

interface TensorPoolEntry {
  tensor: tf.Tensor;
  inUse: boolean;
  lastUsed: number;
}

class TensorMemoryManager {
  private static instance: TensorMemoryManager;
  private pools = new Map<string, TensorPoolEntry[]>();
  private readonly MAX_POOL_SIZE = 10;
  private readonly POOL_CLEANUP_INTERVAL = 60000; // 1 minute
  private cleanupTimer: number | null = null;

  private constructor() {
    this.startCleanupTimer();
    this.logMemoryUsage();
  }

  static getInstance(): TensorMemoryManager {
    if (!TensorMemoryManager.instance) {
      TensorMemoryManager.instance = new TensorMemoryManager();
    }
    return TensorMemoryManager.instance;
  }

  /**
   * Execute function with automatic tensor cleanup
   */
  tidy<T>(fn: () => T): T {
    return tf.tidy(fn);
  }

  /**
   * Execute async function with automatic tensor cleanup
   */
  async tidyAsync<T>(fn: () => Promise<T>): Promise<T> {
    const startNumTensors = tf.memory().numTensors;
    
    try {
      const result = await fn();
      
      const endNumTensors = tf.memory().numTensors;
      const leaked = endNumTensors - startNumTensors;
      
      if (leaked > 0) {
        Logger.warn('TensorMemoryManager', `Potential memory leak: ${leaked} tensors not disposed`);
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get tensor from pool or create new one
   */
  acquire(shape: number[], dtype: tf.DataType = 'float32'): tf.Tensor {
    const key = this.getPoolKey(shape, dtype);
    const pool = this.pools.get(key) || [];

    // Find available tensor in pool
    const entry = pool.find(e => !e.inUse);
    
    if (entry) {
      entry.inUse = true;
      entry.lastUsed = Date.now();
      Logger.info('TensorMemoryManager', 'Tensor acquired from pool', { shape, dtype });
      return entry.tensor;
    }

    // Create new tensor if pool is empty or all in use
    const tensor = tf.zeros(shape, dtype);
    
    const newEntry: TensorPoolEntry = {
      tensor,
      inUse: true,
      lastUsed: Date.now(),
    };

    pool.push(newEntry);
    this.pools.set(key, pool);

    Logger.info('TensorMemoryManager', 'New tensor created', { shape, dtype });
    return tensor;
  }

  /**
   * Return tensor to pool
   */
  release(tensor: tf.Tensor): void {
    const shape = tensor.shape;
    const dtype = tensor.dtype;
    const key = this.getPoolKey(shape, dtype);
    const pool = this.pools.get(key);

    if (!pool) {
      // Not from pool, dispose immediately
      tensor.dispose();
      return;
    }

    const entry = pool.find(e => e.tensor === tensor);
    
    if (entry) {
      entry.inUse = false;
      entry.lastUsed = Date.now();
      Logger.info('TensorMemoryManager', 'Tensor returned to pool', { shape, dtype });
    } else {
      // Not from this pool, dispose
      tensor.dispose();
    }
  }

  /**
   * Dispose all tensors in a list
   */
  disposeAll(tensors: tf.Tensor[]): void {
    for (const tensor of tensors) {
      if (tensor && !tensor.isDisposed) {
        tensor.dispose();
      }
    }
  }

  /**
   * Clear pool for specific shape
   */
  clearPool(shape: number[], dtype: tf.DataType = 'float32'): void {
    const key = this.getPoolKey(shape, dtype);
    const pool = this.pools.get(key);

    if (pool) {
      for (const entry of pool) {
        if (!entry.tensor.isDisposed) {
          entry.tensor.dispose();
        }
      }
      this.pools.delete(key);
      Logger.info('TensorMemoryManager', 'Pool cleared', { shape, dtype });
    }
  }

  /**
   * Clear all pools
   */
  clearAllPools(): void {
    for (const [key, pool] of this.pools.entries()) {
      for (const entry of pool) {
        if (!entry.tensor.isDisposed) {
          entry.tensor.dispose();
        }
      }
    }
    this.pools.clear();
    Logger.info('TensorMemoryManager', 'All pools cleared');
  }

  /**
   * Cleanup unused tensors
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, pool] of this.pools.entries()) {
      // Remove old unused tensors
      const filtered = pool.filter(entry => {
        const age = now - entry.lastUsed;
        const shouldKeep = entry.inUse || age < maxAge;

        if (!shouldKeep && !entry.tensor.isDisposed) {
          entry.tensor.dispose();
          Logger.info('TensorMemoryManager', 'Disposed old tensor', { key, age });
        }

        return shouldKeep;
      });

      // Limit pool size
      if (filtered.length > this.MAX_POOL_SIZE) {
        const excess = filtered.splice(this.MAX_POOL_SIZE);
        for (const entry of excess) {
          if (!entry.tensor.isDisposed) {
            entry.tensor.dispose();
          }
        }
      }

      if (filtered.length > 0) {
        this.pools.set(key, filtered);
      } else {
        this.pools.delete(key);
      }
    }

    this.logMemoryUsage();
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.POOL_CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      window.clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Log current memory usage
   */
  logMemoryUsage(): void {
    const memory = tf.memory();
    Logger.info('TensorMemoryManager', 'Memory usage', {
      numTensors: memory.numTensors,
      numBytes: memory.numBytes,
      numBytesInGPU: memory.numBytesInGPU || 0,
      unreliable: memory.unreliable,
    });
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    tfMemory: tf.MemoryInfo;
    pools: {
      totalPools: number;
      totalTensors: number;
      tensorsInUse: number;
      tensorsFree: number;
    };
  } {
    let totalTensors = 0;
    let tensorsInUse = 0;

    for (const pool of this.pools.values()) {
      totalTensors += pool.length;
      tensorsInUse += pool.filter(e => e.inUse).length;
    }

    return {
      tfMemory: tf.memory(),
      pools: {
        totalPools: this.pools.size,
        totalTensors,
        tensorsInUse,
        tensorsFree: totalTensors - tensorsInUse,
      },
    };
  }

  /**
   * Generate pool key from shape and dtype
   */
  private getPoolKey(shape: number[], dtype: string): string {
    return `${shape.join(',')}_${dtype}`;
  }

  /**
   * Dispose memory manager
   */
  dispose(): void {
    this.stopCleanupTimer();
    this.clearAllPools();
    tf.disposeVariables();
    Logger.info('TensorMemoryManager', 'Memory manager disposed');
  }
}

// Export singleton
export const tensorMemoryManager = TensorMemoryManager.getInstance();

// Helper functions
export const withTensorCleanup = <T>(fn: () => T): T => {
  return tensorMemoryManager.tidy(fn);
};

export const withAsyncTensorCleanup = async <T>(fn: () => Promise<T>): Promise<T> => {
  return await tensorMemoryManager.tidyAsync(fn);
};
