import { describe, it, expect, beforeEach } from 'vitest';

import { CircuitBreaker } from '../../services/circuitBreaker';
import { CircuitBreakerError } from '../../services/errors';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      maxFailures: 3,
      resetTimeout: 1000,
      successThreshold: 2,
    });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should have zero initial failure count', () => {
      expect(circuitBreaker.getMetrics().failureCount).toBe(0);
    });

    it('should have zero initial success count', () => {
      expect(circuitBreaker.getMetrics().successCount).toBe(0);
    });
  });

  describe('successful execution', () => {
    it('should execute operation and return result', async () => {
      const operation = async () => 'success';
      const result = await circuitBreaker.execute(operation);
      expect(result).toBe('success');
    });

    it('should reset failure count on success', async () => {
      // Fail first
      await circuitBreaker
        .execute(async () => {
          throw new Error('fail');
        })
        .catch(() => {
          // Ignore error
        });

      // Succeed to reset
      await circuitBreaker.execute(async () => 'success');

      expect(circuitBreaker.getMetrics().failureCount).toBe(0);
    });

    it('should record success metrics', async () => {
      await circuitBreaker.execute(async () => 'success');

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalSuccesses).toBe(1);
      expect(metrics.successCount).toBe(1);
    });
  });

  describe('failed execution', () => {
    it('should throw error on operation failure', async () => {
      const operation = async () => {
        throw new Error('operation failed');
      };

      await expect(circuitBreaker.execute(operation)).rejects.toThrow('operation failed');
    });

    it('should increment failure count', async () => {
      await circuitBreaker
        .execute(async () => {
          throw new Error('fail');
        })
        .catch(() => {
          // Ignore error
        });

      expect(circuitBreaker.getMetrics().failureCount).toBe(1);
    });

    it('should open circuit after max failures', async () => {
      // Fail maxFailures times
      for (let i = 0; i < 3; i++) {
        await circuitBreaker
          .execute(async () => {
            throw new Error('fail');
          })
          .catch(() => {
            // Ignore errors
          });
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('OPEN state', () => {
    it('should reject operations when OPEN', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await circuitBreaker
          .execute(async () => {
            throw new Error('fail');
          })
          .catch(() => {
            // Ignore errors
          });
      }

      await expect(circuitBreaker.execute(async () => 'success')).rejects.toThrow(
        'Circuit is OPEN',
      );
    });

    it('should use fallback when provided and OPEN', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await circuitBreaker
          .execute(async () => {
            throw new Error('fail');
          })
          .catch(() => {
            // Ignore errors
          });
      }

      const fallback = async () => 'fallback-result';
      const result = await circuitBreaker.execute(async () => 'should-not-run', fallback);
      expect(result).toBe('fallback-result');
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await circuitBreaker
          .execute(async () => {
            throw new Error('fail');
          })
          .catch(() => {
            // Ignore errors
          });
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Operation should now be allowed
      await circuitBreaker.execute(async () => 'success');

      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
    });
  });

  describe('HALF_OPEN state', () => {
    it('should allow single test operation', async () => {
      // Open then wait for reset to get to HALF_OPEN
      for (let i = 0; i < 3; i++) {
        await circuitBreaker
          .execute(async () => {
            throw new Error('fail');
          })
          .catch(() => {
            // Ignore errors
          });
      }

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await circuitBreaker.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('should close circuit after success threshold reached', async () => {
      // Open then wait for reset to get to HALF_OPEN
      for (let i = 0; i < 3; i++) {
        await circuitBreaker
          .execute(async () => {
            throw new Error('fail');
          })
          .catch(() => {
            // Ignore errors
          });
      }

      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Execute successfully successThreshold times
      for (let i = 0; i < 2; i++) {
        await circuitBreaker.execute(async () => 'success');
      }

      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should open again on failure in HALF_OPEN', async () => {
      // Open then wait for reset to get to HALF_OPEN
      for (let i = 0; i < 3; i++) {
        await circuitBreaker
          .execute(async () => {
            throw new Error('fail');
          })
          .catch(() => {
            // Ignore errors
          });
      }

      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Fail in HALF_OPEN
      await circuitBreaker
        .execute(async () => {
          throw new Error('fail');
        })
        .catch(() => {
          // Ignore error
        });

      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('metrics', () => {
    it('should track total executions', async () => {
      await circuitBreaker.execute(async () => 'success');
      await circuitBreaker.execute(async () => 'success');
      await circuitBreaker
        .execute(async () => {
          throw new Error('fail');
        })
        .catch(() => {
          // Ignore
        });

      expect(circuitBreaker.getMetrics().totalExecutions).toBe(3);
    });

    it('should calculate success rate', async () => {
      await circuitBreaker.execute(async () => 'success');
      await circuitBreaker.execute(async () => 'success');
      await circuitBreaker
        .execute(async () => {
          throw new Error('fail');
        })
        .catch(() => {
          // Ignore
        });

      expect(circuitBreaker.getSuccessRate()).toBeCloseTo(0.666, 2);
    });

    it('should calculate failure rate', async () => {
      await circuitBreaker.execute(async () => 'success');
      await circuitBreaker
        .execute(async () => {
          throw new Error('fail');
        })
        .catch(() => {
          // Ignore
        });

      expect(circuitBreaker.getFailureRate()).toBeCloseTo(0.5, 2);
    });
  });

  describe('reset', () => {
    it('should reset to CLOSED state', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await circuitBreaker
          .execute(async () => {
            throw new Error('fail');
          })
          .catch(() => {
            // Ignore errors
          });
      }

      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getMetrics().failureCount).toBe(0);
      expect(circuitBreaker.getMetrics().successCount).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('should check if OPEN', async () => {
      expect(circuitBreaker.isOpen()).toBe(false);

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await circuitBreaker
          .execute(async () => {
            throw new Error('fail');
          })
          .catch(() => {
            // Ignore errors
          });
      }

      expect(circuitBreaker.isOpen()).toBe(true);
    });

    it('should check if CLOSED', () => {
      expect(circuitBreaker.isClosed()).toBe(true);
    });

    it('should check if HALF_OPEN', () => {
      expect(circuitBreaker.isHalfOpen()).toBe(false);
    });
  });
});

describe('CircuitBreakerError', () => {
  it('should create error with code', () => {
    const error = new CircuitBreakerError('Test message', 'CIRCUIT_OPEN');
    expect(error._code).toBe('CIRCUIT_OPEN');
  });

  it('should create error with details', () => {
    const details = { attempt: 1, agent: 'TestAgent' };
    const error = new CircuitBreakerError('Test message', 'CIRCUIT_OPEN', details);
    expect(error._details).toEqual(details);
  });

  it('should have correct error name', () => {
    const error = new CircuitBreakerError('Test message', 'CIRCUIT_OPEN');
    expect(error.name).toBe('CircuitBreakerError');
  });
});
