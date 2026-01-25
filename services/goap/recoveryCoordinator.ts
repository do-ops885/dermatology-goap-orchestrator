import { RECOVERY_STRATEGIES } from '../../types';
import { CircuitBreaker } from '../circuitBreaker';

import { EXECUTOR_REGISTRY } from './registry';

import type { ExecutorFn } from './agent';
import type { AgentAction } from '../../types';
import type { AgentContext } from '../executors/types';

/**
 * Recovery Coordinator
 * Manages circuit breakers and retry logic for agent execution
 */
export class RecoveryCoordinator {
  private circuitBreakers: Map<string, CircuitBreaker>;
  private retryCount: Map<string, number>;

  constructor() {
    this.circuitBreakers = new Map();
    this.retryCount = new Map();
  }

  /**
   * Get or create a circuit breaker for a specific agent
   */
  public getCircuitBreaker(agentId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(agentId)) {
      const strategy = RECOVERY_STRATEGIES[agentId] ?? {
        critical: false,
        retry: true,
        maxRetries: 3,
        retryDelayMs: 1000,
      };
      this.circuitBreakers.set(
        agentId,
        new CircuitBreaker({
          maxFailures: strategy.maxRetries + 2,
          resetTimeout: 60000,
          successThreshold: 2,
        }),
      );
    }
    return this.circuitBreakers.get(agentId)!;
  }

  /**
   * Execute agent with recovery strategies using circuit breaker
   */
  public async executeWithRecovery(
    action: AgentAction,
    executor: ExecutorFn,
    runId: string,
  ): Promise<unknown> {
    const strategy = RECOVERY_STRATEGIES[action.agentId] ?? {
      critical: false,
      retry: true,
      maxRetries: 3,
      retryDelayMs: 1000,
    };

    const circuitBreaker = this.getCircuitBreaker(action.agentId);

    if (!strategy.retry) {
      return await circuitBreaker.execute(() => executor({} as AgentContext));
    }

    const attemptKey = `${runId}_${action.agentId}`;
    let attempt = (this.retryCount.get(attemptKey) ?? 0) + 1;
    this.retryCount.set(attemptKey, attempt);

    try {
      const result = await circuitBreaker.execute(
        () => executor({} as AgentContext),
        async () => {
          // Fallback: try alternative agent if configured
          if (strategy.fallbackAgentId !== undefined && strategy.fallbackAgentId !== '') {
            const fallbackExecutor = EXECUTOR_REGISTRY[strategy.fallbackAgentId];
            if (fallbackExecutor !== undefined) {
              return await fallbackExecutor({} as AgentContext);
            }
            throw new Error('Fallback executor not available');
          }
          throw new Error('Fallback not available');
        },
      );
      this.retryCount.delete(attemptKey);
      return result;
    } catch (error) {
      if (attempt < strategy.maxRetries) {
        throw error;
      }
      if (strategy.critical) {
        throw new Error(
          `Critical agent ${action.agentId} failed after ${strategy.maxRetries} attempts`,
        );
      }
      throw error;
    }
  }

  /**
   * Get current retry count for an agent
   */
  public getRetryCount(runId: string, agentId: string): number {
    return this.retryCount.get(`${runId}_${agentId}`) ?? 0;
  }

  /**
   * Reset retry counters for a run
   */
  public resetRetryCount(runId: string): void {
    for (const key of this.retryCount.keys()) {
      if (key.startsWith(`${runId}_`)) {
        this.retryCount.delete(key);
      }
    }
  }
}
