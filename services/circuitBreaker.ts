import type { CircuitBreakerConfig, CircuitBreakerMetrics, CircuitState } from './errors';

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  maxFailures: 5,
  resetTimeout: 60000,
  successThreshold: 3,
};

export class CircuitBreaker {
  private readonly config: CircuitBreakerConfig;
  private state: CircuitState;
  private failureCount: number;
  private successCount: number;
  private lastFailureTime: number | null;
  private lastSuccessTime: number | null;
  private totalExecutions: number;
  private totalFailures: number;
  private totalSuccesses: number;
  private nextAttemptTime: number | null;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.totalExecutions = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.nextAttemptTime = null;
  }

  public async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    this.totalExecutions++;

    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        const timeUntilReset = this.timeUntilReset();
        if (fallback !== undefined) {
          return await fallback();
        }
        throw new Error(`Circuit is OPEN. Time until reset: ${timeUntilReset}ms`);
      }
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      if (fallback !== undefined) {
        return await fallback();
      }
      throw error;
    }
  }

  public getState(): CircuitState {
    return this.state;
  }

  public getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalExecutions: this.totalExecutions,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttemptTime = null;
  }

  public isOpen(): boolean {
    return this.state === 'OPEN';
  }

  public isClosed(): boolean {
    return this.state === 'CLOSED';
  }

  public isHalfOpen(): boolean {
    return this.state === 'HALF_OPEN';
  }

  private recordSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.totalSuccesses++;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  private recordFailure(): void {
    this.lastFailureTime = Date.now();
    this.totalFailures++;

    if (this.state === 'HALF_OPEN') {
      this.transitionToOpen();
    } else if (this.state === 'CLOSED') {
      this.failureCount++;
      if (this.failureCount >= this.config.maxFailures) {
        this.transitionToOpen();
      }
    }
  }

  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime !== null && Date.now() >= this.nextAttemptTime;
  }

  private timeUntilReset(): number {
    if (this.nextAttemptTime === null) {
      return 0;
    }
    return Math.max(0, this.nextAttemptTime - Date.now());
  }

  private transitionToOpen(): void {
    this.state = 'OPEN';
    this.successCount = 0;
    this.nextAttemptTime = Date.now() + this.config.resetTimeout;
  }

  private transitionToHalfOpen(): void {
    this.state = 'HALF_OPEN';
    this.nextAttemptTime = null;
    this.successCount = 0;
  }

  private transitionToClosed(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = null;
  }

  public getSuccessRate(): number {
    if (this.totalExecutions === 0) {
      return 1.0;
    }
    return this.totalSuccesses / this.totalExecutions;
  }

  public getFailureRate(): number {
    if (this.totalExecutions === 0) {
      return 0.0;
    }
    return this.totalFailures / this.totalExecutions;
  }
}
