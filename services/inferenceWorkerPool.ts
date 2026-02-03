/**
 * Inference Worker Pool
 * 
 * Manages a pool of Web Workers for ML inference to maximize throughput
 * while keeping the main thread responsive.
 * 
 * @see plans/24_performance_optimization_strategy.md
 */

import { Logger } from './logger';

interface WorkerTask {
  id: string;
  type: 'classify' | 'preprocess' | 'saliency';
  data: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

class InferenceWorkerPool {
  private static instance: InferenceWorkerPool;
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private pendingTasks = new Map<string, WorkerTask>();
  private readonly maxWorkers = navigator.hardwareConcurrency || 4;
  private initialized = false;

  private constructor() {
    // Initialize on first use
  }

  static getInstance(): InferenceWorkerPool {
    if (!InferenceWorkerPool.instance) {
      InferenceWorkerPool.instance = new InferenceWorkerPool();
    }
    return InferenceWorkerPool.instance;
  }

  /**
   * Initialize worker pool
   */
  async initialize(modelURL: string): Promise<void> {
    if (this.initialized) return;

    Logger.info('InferenceWorkerPool', `Initializing ${this.maxWorkers} workers`);

    // Create worker pool
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = new Worker(
          new URL('../workers/inference.worker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (event) => this.handleWorkerMessage(worker, event);
        worker.onerror = (error) => this.handleWorkerError(worker, error);

        // Initialize worker with model
        worker.postMessage({ type: 'init', modelURL });

        this.workers.push(worker);
        this.availableWorkers.push(worker);
      } catch (error) {
        Logger.error('InferenceWorkerPool', `Failed to create worker ${i}`, { error });
      }
    }

    this.initialized = true;
    Logger.info('InferenceWorkerPool', 'Worker pool initialized', {
      workers: this.workers.length,
    });
  }

  /**
   * Execute inference task
   */
  async execute<T>(
    type: 'classify' | 'preprocess' | 'saliency',
    data: any
  ): Promise<T> {
    if (!this.initialized) {
      throw new Error('Worker pool not initialized');
    }

    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: `task_${Math.random().toString(36).substring(2, 11)}`,
        type,
        data,
        resolve,
        reject,
      };

      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  /**
   * Process task queue
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const task = this.taskQueue.shift()!;
      const worker = this.availableWorkers.shift()!;

      this.pendingTasks.set(task.id, task);

      worker.postMessage({
        type: task.type,
        data: task.data,
        id: task.id,
      });
    }
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(worker: Worker, event: MessageEvent): void {
    const { type, id, result, error } = event.data;

    if (type === 'model_loaded') {
      Logger.info('InferenceWorkerPool', 'Worker model loaded');
      return;
    }

    const task = this.pendingTasks.get(id);
    if (!task) {
      Logger.warn('InferenceWorkerPool', 'Received response for unknown task', { id });
      return;
    }

    this.pendingTasks.delete(id);
    this.availableWorkers.push(worker);

    if (type === 'success') {
      task.resolve(result);
    } else {
      task.reject(new Error(error || 'Worker task failed'));
    }

    // Process next task
    this.processQueue();
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    Logger.error('InferenceWorkerPool', 'Worker error', { error: error.message });

    // Find and reject pending tasks for this worker
    for (const [id, task] of this.pendingTasks.entries()) {
      task.reject(new Error('Worker crashed'));
      this.pendingTasks.delete(id);
    }

    // Remove crashed worker
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      this.workers.splice(index, 1);
    }

    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex !== -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalWorkers: number;
    availableWorkers: number;
    pendingTasks: number;
    queuedTasks: number;
  } {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      pendingTasks: this.pendingTasks.size,
      queuedTasks: this.taskQueue.length,
    };
  }

  /**
   * Cleanup workers
   */
  dispose(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }

    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.pendingTasks.clear();
    this.initialized = false;

    Logger.info('InferenceWorkerPool', 'Worker pool disposed');
  }
}

export const workerPool = InferenceWorkerPool.getInstance();
