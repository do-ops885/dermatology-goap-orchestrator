import * as tf from '@tensorflow/tfjs';
import { Logger } from './logger';

export interface MemoryPoolTier {
  name: string;
  minSize: number;
  maxSize: number;
  maxItems: number;
  priority: number;
}

export interface PooledTensor {
  tensor: tf.Tensor;
  timestamp: number;
  size: number;
  accessCount: number;
}

export class GPUMemoryPool {
  private static instance: GPUMemoryPool;
  private pools: Map<string, PooledTensor[]> = new Map();
  private readonly tiers: MemoryPoolTier[] = [
    { name: 'small', minSize: 0, maxSize: 1024 * 1024, maxItems: 100, priority: 3 }, // <1MB
    { name: 'medium', minSize: 1024 * 1024, maxSize: 16 * 1024 * 1024, maxItems: 50, priority: 2 }, // 1-16MB
    { name: 'large', minSize: 16 * 1024 * 1024, maxSize: Infinity, maxItems: 10, priority: 1 }, // >16MB
  ];

  private constructor() {
    this.initializePools();
  }

  public static getInstance(): GPUMemoryPool {
    GPUMemoryPool.instance ??= new GPUMemoryPool();
    return GPUMemoryPool.instance;
  }

  private initializePools() {
    for (const tier of this.tiers) {
      this.pools.set(tier.name, []);
    }
  }

  private getTierForSize(size: number): MemoryPoolTier {
    for (const tier of this.tiers) {
      if (size >= tier.minSize && size < tier.maxSize) {
        return tier;
      }
    }
    // Return the largest tier if no match found
    const lastTier = this.tiers[this.tiers.length - 1];
    if (!lastTier) {
      throw new Error('No memory tiers configured');
    }
    return lastTier;
  }

  private estimateTensorSize(shape: number[], dtype: string): number {
    let bytesPerElement = 4; // float32 default
    switch (dtype) {
      case 'bool':
      case 'int32':
      case 'float32':
      case 'complex64':
        bytesPerElement = 4;
        break;
      case 'float16':
        bytesPerElement = 2;
        break;
      case 'int8':
        bytesPerElement = 1;
        break;
    }

    const totalElements = shape.reduce((acc, dim) => acc * dim, 1);
    return totalElements * bytesPerElement;
  }

  public async allocate(
    shape: number[],
    dtype: tf.DataType = 'float32' as tf.DataType,
    _key = 'default',
  ): Promise<tf.Tensor> {
    const estimatedSize = this.estimateTensorSize(shape, dtype as string);
    const tier = this.getTierForSize(estimatedSize);
    const pool = this.pools.get(tier.name)!;

    // Try to find a reusable tensor in the pool
    const reusableTensor = this.findReusableTensor(pool, shape, dtype as string);

    if (reusableTensor) {
      Logger.debug('GPU Memory Pool', `Reused tensor from ${tier.name} pool`, {
        shape,
        dtype,
        size: estimatedSize,
      });
      reusableTensor.accessCount++;
      reusableTensor.timestamp = Date.now();
      return reusableTensor.tensor;
    }

    // Create new tensor if no reusable one found
    try {
      const tensor = tf.tidy(() => {
        const newTensor = tf.zeros(shape, dtype || 'float32');
        return newTensor;
      });

      Logger.debug('GPU Memory Pool', `Allocated new tensor in ${tier.name} pool`, {
        shape,
        dtype,
        size: estimatedSize,
      });

      return tensor;
    } catch (error) {
      Logger.error('GPU Memory Pool', 'Failed to allocate tensor', { error, shape, dtype });
      throw new Error(`Failed to allocate tensor: ${error}`);
    }
  }

  private findReusableTensor(
    pool: PooledTensor[],
    shape: number[],
    dtype: string,
  ): PooledTensor | null {
    // Find tensor with same shape and dtype that hasn't been used recently
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (let i = 0; i < pool.length; i++) {
      const pooled = pool[i];
      if (
        pooled &&
        this.shapesEqual(pooled.tensor.shape as number[], shape) &&
        pooled.tensor.dtype === dtype &&
        now - pooled.timestamp < maxAge
      ) {
        // Remove from pool and return
        pool.splice(i, 1);
        return pooled;
      }
    }

    return null;
  }

  private shapesEqual(shape1: number[], shape2: number[]): boolean {
    if (shape1.length !== shape2.length) return false;
    return shape1.every((dim, index) => dim === shape2[index]);
  }

  public async release(tensor: tf.Tensor, _key = 'default'): Promise<void> {
    if (tensor.isDisposed) {
      Logger.warn('GPU Memory Pool', 'Attempted to release disposed tensor');
      return;
    }

    const estimatedSize = this.estimateTensorSize(tensor.shape as number[], tensor.dtype as string);
    const tier = this.getTierForSize(estimatedSize);
    const pool = this.pools.get(tier.name);
    if (!pool) {
      throw new Error(`Pool ${tier.name} not initialized`);
    }

    // Check if pool has space
    if (pool.length >= tier.maxItems) {
      // Remove oldest item
      const oldestIndex = pool.reduce((oldest, current, index, array) => {
        const oldestItem = array[oldest];
        return oldestItem && current.timestamp < oldestItem.timestamp ? index : oldest;
      }, 0);
      
      const removed = pool.splice(oldestIndex, 1)[0];
      if (removed?.tensor) {
        removed.tensor.dispose();
        Logger.debug('GPU Memory Pool', `Evicted tensor from ${tier.name} pool`);
      }
    }

    // Add tensor to pool
    pool.push({
      tensor,
      timestamp: Date.now(),
      size: estimatedSize,
      accessCount: 0,
    });

    Logger.debug('GPU Memory Pool', `Released tensor to ${tier.name} pool`, {
      shape: tensor.shape,
      dtype: tensor.dtype,
      size: estimatedSize,
      poolSize: pool.length,
    });
  }

  public getPoolStats() {
    const stats: Record<string, {
      currentItems: number;
      maxItems: number;
      totalSize: number;
      utilization: number;
      priority: number;
    }> = {};

    for (const tier of this.tiers) {
      const pool = this.pools.get(tier.name);
      if (!pool) continue;
      
      const totalSize = pool.reduce((sum, item) => sum + item.size, 0);

      stats[tier.name] = {
        currentItems: pool.length,
        maxItems: tier.maxItems,
        totalSize,
        utilization: pool.length / tier.maxItems,
        priority: tier.priority,
      };
    }

    return stats;
  }

  public async withErrorScope<T>(fn: () => Promise<T>): Promise<T> {
    try {
      // Push error scope for WebGPU backend
      if (tf.getBackend() === 'webgpu') {
        const backend = tf.backend() as unknown;
        if (typeof backend === 'object' && backend !== null && 'context' in backend) {
          const ctx = (backend as { context?: unknown }).context;
          if (typeof ctx === 'object' && ctx !== null && 'device' in ctx) {
            const device = (ctx as { device?: unknown }).device;
            if (typeof device === 'object' && device !== null && 'pushErrorScope' in device) {
              const pushFn = (device as { pushErrorScope: (_scope: string) => Promise<void> }).pushErrorScope;
              await pushFn('out-of-memory');
            }
          }
        }
      }

      const result = await fn();

      // Pop error scope and check for errors
      if (tf.getBackend() === 'webgpu') {
        const backend = tf.backend() as unknown;
        if (typeof backend === 'object' && backend !== null && 'context' in backend) {
          const ctx = (backend as { context?: unknown }).context;
          if (typeof ctx === 'object' && ctx !== null && 'device' in ctx) {
            const device = (ctx as { device?: unknown }).device;
            if (typeof device === 'object' && device !== null && 'popErrorScope' in device) {
              const popFn = (device as { popErrorScope: () => Promise<unknown> }).popErrorScope;
              const error = await popFn();
              if (error) {
                Logger.error('WebGPU Error Scope', 'Memory error detected', { error });
                // Trigger fallback to CPU backend
                await this.fallbackToCPU();
              }
            }
          }
        }
      }

      return result;
    } catch (error) {
      Logger.error('WebGPU Error Scope', 'Operation failed', { error });
      await this.fallbackToCPU();
      throw error;
    }
  }

  private async fallbackToCPU(): Promise<void> {
    try {
      Logger.warn('GPU Memory Pool', 'Falling back to CPU backend due to memory errors');
      await tf.setBackend('cpu');

      // Clear all pools to free GPU memory
      await this.clearAllPools();

      // Notify about backend change
      Logger.info('GPU Memory Pool', 'Successfully switched to CPU backend');
    } catch (error) {
      Logger.error('GPU Memory Pool', 'Failed to fallback to CPU', { error });
      throw error;
    }
  }

  public async clearAllPools(): Promise<void> {
    for (const [tierName, pool] of this.pools) {
      pool.forEach((item) => item.tensor.dispose());
      pool.length = 0;
      Logger.debug('GPU Memory Pool', `Cleared ${tierName} pool`);
    }
  }

  public getTensorTracker() {
    const trackedTensors = new WeakSet<tf.Tensor>();

    const trackedTidy = (fn: () => tf.Tensor) => {
      return tf.tidy(() => {
        const result = fn();
        trackedTensors.add(result);
        return result;
      });
    };

    return {
      trackedTensors,
      trackedTidy,
      getUnreleasedCount: () => {
        // This is a simplified check - in practice you'd track creation/destruction
        return 0; // Placeholder
      },
    };
  }

  public dispose() {
    this.clearAllPools();
    this.pools.clear();
  }
}
