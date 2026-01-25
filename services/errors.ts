export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly _code:
      | 'CIRCUIT_OPEN'
      | 'CIRCUIT_CLOSED'
      | 'CIRCUIT_HALF_OPEN'
      | 'EXECUTION_FAILED'
      | 'THRESHOLD_EXCEEDED'
      | 'TIMEOUT_EXCEEDED',
    public readonly _details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  maxFailures: number;
  resetTimeout: number;
  successThreshold: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalExecutions: number;
  totalFailures: number;
  totalSuccesses: number;
}
