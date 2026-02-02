import { describe, it, expect, beforeEach } from 'vitest';

import { EventBus, globalEventBus } from '../../services/eventBus';

import type { AgentEventPayload } from '../../types';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus({ maxHistorySize: 10, enableHistory: true });
  });

  describe('subscription', () => {
    it('should register event listener', () => {
      let called = false;
      const handler = () => {
        called = true;
      };

      eventBus.on('agent:start', handler);
      void eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });

      expect(called).toBe(true);
    });

    it('should return unsubscribe function', () => {
      let called = 0;
      const handler = () => {
        called++;
      };

      const unsubscribe = eventBus.on('agent:start', handler);

      void eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });
      expect(called).toBe(1);

      unsubscribe();

      void eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });
      expect(called).toBe(1); // Should not increment after unsubscribe
    });

    it('should support multiple listeners for same event', () => {
      const calls: number[] = [];

      const handler1 = () => {
        calls.push(1);
      };
      const handler2 = () => {
        calls.push(2);
      };

      eventBus.on('agent:start', handler1);
      eventBus.on('agent:start', handler2);

      void eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });

      expect(calls).toEqual([1, 2]);
    });

    it('should handle once() - call only once', () => {
      let called = 0;
      const handler = () => {
        called++;
      };

      eventBus.once('agent:start', handler);

      void eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });
      void eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });

      expect(called).toBe(1);
    });

    it('should remove listeners via removeAllListeners()', () => {
      let called = 0;
      const handler = () => {
        called++;
      };

      eventBus.on('agent:start', handler);

      void eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });
      expect(called).toBe(1);

      eventBus.removeAllListeners('agent:start');

      void eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });
      expect(called).toBe(1);
    });

    it('should remove listener via off()', () => {
      let called = 0;
      const handler = () => {
        called++;
      };

      // Store the unsubscribe function which internally calls off()
      const unsubscribe = eventBus.on('agent:start', handler);

      expect(eventBus.getListenerCount('agent:start')).toBe(1);

      void eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });
      expect(called).toBe(1);

      // Call unsubscribe (which calls off() internally)
      unsubscribe();

      // Listener should be removed
      expect(eventBus.getListenerCount('agent:start')).toBe(0);

      // Emit again - listener should not be called
      void eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });
      expect(called).toBe(1); // Still 1, not incremented
    });
  });

  describe('emission', () => {
    it('should emit event with payload', async () => {
      let receivedPayload: AgentEventPayload | undefined;

      const handler = (payload: AgentEventPayload) => {
        receivedPayload = payload;
      };

      eventBus.on('agent:start', handler as (payload: unknown) => void);

      const payload: AgentEventPayload = {
        agentId: 'TestAgent',
        timestamp: Date.now(),
        data: { test: 'value' },
      };

      await eventBus.emit('agent:start', payload);

      expect(receivedPayload).toEqual(payload);
    });

    it('should emit to all listeners', async () => {
      const calls: AgentEventPayload[] = [];

      const handler1 = (payload: AgentEventPayload) => {
        calls.push(payload);
      };
      const handler2 = (payload: AgentEventPayload) => {
        calls.push(payload);
      };

      eventBus.on('agent:start', handler1 as (payload: unknown) => void);
      eventBus.on('agent:start', handler2 as (payload: unknown) => void);

      const payload: AgentEventPayload = {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      };

      await eventBus.emit('agent:start', payload);

      expect(calls).toHaveLength(2);
      expect(calls[0]).toEqual(payload);
      expect(calls[1]).toEqual(payload);
    });

    it('should handle errors in event handlers gracefully', async () => {
      const errorHandler = () => {
        throw new Error('Handler error');
      };
      const successHandler = () => {
        // Should still be called
      };

      eventBus.on('agent:start', errorHandler);
      eventBus.on('agent:start', successHandler);

      await eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });
      // Should not throw error
    });
  });

  describe('history', () => {
    it('should store event history when enabled', async () => {
      await eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });

      const history = eventBus.getHistory('agent:start');
      expect(history).toHaveLength(1);
      expect(history[0]?.type).toBe('agent:start');
    });

    it('should limit history size', async () => {
      // Emit more than maxHistorySize (10)
      for (let i = 0; i < 15; i++) {
        await eventBus.emit('agent:start', {
          agentId: `TestAgent${i}`,
          timestamp: Date.now() + i,
        });
      }

      const history = eventBus.getHistory();
      expect(history).toHaveLength(10); // Should be limited to maxHistorySize
    });

    it('should return history for specific event type', async () => {
      await eventBus.emit('agent:start', {
        agentId: 'Agent1',
        timestamp: Date.now(),
      });
      await eventBus.emit('agent:complete', {
        agentId: 'Agent2',
        timestamp: Date.now(),
      });

      const agentStartHistory = eventBus.getHistory('agent:start');
      const agentCompleteHistory = eventBus.getHistory('agent:complete');

      expect(agentStartHistory).toHaveLength(1);
      expect(agentCompleteHistory).toHaveLength(1);
    });

    it('should clear history', async () => {
      await eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });

      expect(eventBus.getHistory()).toHaveLength(1);

      eventBus.clearHistory();

      expect(eventBus.getHistory()).toHaveLength(0);
    });
  });

  describe('replay', () => {
    it('should replay events from history', async () => {
      let replayCount = 0;
      const handler = () => {
        replayCount++;
      };

      eventBus.on('agent:start', handler);

      // Emit original event
      await eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });

      expect(replayCount).toBe(1);

      // Replay from history
      const replayed = await eventBus.replay('agent:start');

      expect(replayed).toBe(1);
      expect(replayCount).toBe(2); // Original + replayed
    });

    it('should replay events from specific time', async () => {
      const now = Date.now();

      // Emit events at different times
      await eventBus.emit('agent:start', {
        agentId: 'Agent1',
        timestamp: now,
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await eventBus.emit('agent:start', {
        agentId: 'Agent2',
        timestamp: Date.now(),
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await eventBus.emit('agent:start', {
        agentId: 'Agent3',
        timestamp: Date.now(),
      });

      // Replay from second event onwards
      const replayed = await eventBus.replay('agent:start', {
        fromTime: now + 10,
      });

      expect(replayed).toBe(2); // Should replay last 2 events
    });

    it('should limit replayed events', async () => {
      // Emit multiple events
      for (let i = 0; i < 5; i++) {
        await eventBus.emit('agent:start', {
          agentId: `Agent${i}`,
          timestamp: Date.now(),
        });
      }

      // Replay with limit
      const replayed = await eventBus.replay('agent:start', { limit: 2 });

      expect(replayed).toBe(2);
    });

    it('should throw error when history disabled', async () => {
      const eventBusNoHistory = new EventBus({ enableHistory: false });

      await expect(eventBusNoHistory.replay('agent:start')).rejects.toThrow(
        'History replay is disabled',
      );
    });
  });

  describe('utility methods', () => {
    it('should get listener count', () => {
      eventBus.on('agent:start', () => {
        // Handler 1
      });
      eventBus.on('agent:start', () => {
        // Handler 2
      });
      eventBus.on('agent:complete', () => {
        // Handler 3
      });

      expect(eventBus.getListenerCount()).toBe(3);
      expect(eventBus.getListenerCount('agent:start')).toBe(2);
    });

    it('should get event types', () => {
      eventBus.on('agent:start', () => {
        // Handler
      });
      eventBus.on('agent:complete', () => {
        // Handler
      });

      const types = eventBus.getEventTypes();
      expect(types).toContain('agent:start');
      expect(types).toContain('agent:complete');
    });

    it('should remove all listeners', () => {
      eventBus.on('agent:start', () => {
        // Handler
      });

      expect(eventBus.getListenerCount()).toBeGreaterThan(0);

      eventBus.removeAllListeners();

      expect(eventBus.getListenerCount()).toBe(0);
    });

    it('should remove listeners for specific event', () => {
      eventBus.on('agent:start', () => {
        // Handler 1
      });
      eventBus.on('agent:start', () => {
        // Handler 2
      });
      eventBus.on('agent:complete', () => {
        // Handler 3
      });

      eventBus.removeAllListeners('agent:start');

      expect(eventBus.getListenerCount('agent:start')).toBe(0);
      expect(eventBus.getListenerCount('agent:complete')).toBe(1);
    });

    it('should destroy and clean up', async () => {
      eventBus.on('agent:start', () => {
        // Handler
      });

      await eventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });

      eventBus.destroy();

      expect(eventBus.getListenerCount()).toBe(0);
      expect(eventBus.getHistory()).toHaveLength(0);
    });
  });

  describe('globalEventBus', () => {
    it('should export a global instance', () => {
      expect(globalEventBus).toBeInstanceOf(EventBus);
    });

    it('should allow using global instance', async () => {
      let called = false;
      const handler = () => {
        called = true;
      };

      globalEventBus.on('agent:start', handler);
      await globalEventBus.emit('agent:start', {
        agentId: 'TestAgent',
        timestamp: Date.now(),
      });

      expect(called).toBe(true);
    });
  });
});
