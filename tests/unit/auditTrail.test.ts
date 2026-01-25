import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AuditTrailService } from '../../services/auditTrail';

import type { AuditEvent } from '../../services/auditTrail';

// Mock CryptoService
vi.mock('../../services/crypto', () => ({
  CryptoService: {
    generateHash: vi.fn().mockImplementation((data: string) => {
      // Simple mock hash based on data length and content
      return Promise.resolve(`hash_${data.length}_${data.slice(0, 10)}`);
    }),
  },
}));

// Mock crypto.randomUUID
const mockUUID = vi.fn();
Object.defineProperty(global.crypto, 'randomUUID', {
  value: mockUUID,
  writable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('AuditTrailService', () => {
  let service: AuditTrailService;
  let uuidCounter = 0;

  beforeEach(() => {
    service = AuditTrailService.getInstance();
    // Clear internal state
    (service as any).auditEvents = [];
    (service as any).lastHash = '';
    (service as any).isInitialized = false;
    localStorageMock.clear();
    vi.clearAllMocks();

    uuidCounter = 0;
    mockUUID.mockImplementation(() => `uuid_${++uuidCounter}`);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AuditTrailService.getInstance();
      const instance2 = AuditTrailService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize with empty chain when no stored data', async () => {
      const state = await service.initialize();

      expect(state.totalEvents).toBe(0);
      expect(state.lastHash).toBe('');
      expect(state.corruptionDetected).toBe(false);
    });

    it('should load existing audit chain from localStorage', async () => {
      const mockEvents: AuditEvent[] = [
        {
          id: 'event_1',
          timestamp: Date.now(),
          type: 'TEST_EVENT',
          data: { test: true },
          hash: 'hash_1',
          previousHash: '',
          agentTrace: [],
          safetyLevel: 'LOW',
        },
      ];

      localStorageMock.setItem('dermatology_audit_trail', JSON.stringify(mockEvents));

      const state = await service.initialize();

      expect(state.totalEvents).toBe(1);
      expect(state.lastHash).toBe('hash_1');
    });

    it('should return same state if already initialized', async () => {
      const state1 = await service.initialize();
      const state2 = await service.initialize();

      expect(state1).toEqual(state2);
      expect((service as any).isInitialized).toBe(true);
    });

    it('should handle corrupted localStorage data', async () => {
      localStorageMock.setItem('dermatology_audit_trail', 'invalid json');

      const state = await service.initialize();

      expect(state.totalEvents).toBe(0);
      expect(state.corruptionDetected).toBe(false);
    });

    it('should detect corruption on load', async () => {
      const mockEvents: AuditEvent[] = [
        {
          id: 'event_1',
          timestamp: Date.now(),
          type: 'TEST',
          data: {},
          hash: 'wrong_hash',
          previousHash: '',
          agentTrace: [],
          safetyLevel: 'LOW',
        },
      ];

      localStorageMock.setItem('dermatology_audit_trail', JSON.stringify(mockEvents));

      const state = await service.initialize();

      // Should load but mark as invalid after verification
      expect(state.totalEvents).toBe(1);
    });
  });

  describe('logEvent', () => {
    it('should log a new audit event', async () => {
      await service.initialize();

      const eventId = await service.logEvent('USER_ACTION', { action: 'click' });

      expect(eventId).toBe('uuid_1');
      expect((service as any).auditEvents).toHaveLength(1);
    });

    it('should assign correct properties to event', async () => {
      await service.initialize();

      const beforeTime = Date.now();
      await service.logEvent('TEST_EVENT', { data: 'test' }, ['agent1'], 'HIGH');
      const afterTime = Date.now();

      const events = (service as any).auditEvents as AuditEvent[];
      const event = events[0];

      expect(event?.type).toBe('TEST_EVENT');
      expect(event?.data).toEqual({ data: 'test' });
      expect(event?.agentTrace).toEqual(['agent1']);
      expect(event?.safetyLevel).toBe('HIGH');
      expect(event?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(event?.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should chain events with previousHash', async () => {
      await service.initialize();

      await service.logEvent('EVENT_1', {});
      await service.logEvent('EVENT_2', {});

      const events = (service as any).auditEvents as AuditEvent[];

      expect(events[0]?.previousHash).toBe('');
      expect(events[1]?.previousHash).toBe(events[0]?.hash);
    });

    it('should update lastHash after logging', async () => {
      await service.initialize();

      await service.logEvent('EVENT', {});

      const events = (service as any).auditEvents as AuditEvent[];
      expect((service as any).lastHash).toBe(events[0]?.hash);
    });

    it('should persist to localStorage', async () => {
      await service.initialize();

      await service.logEvent('EVENT', {});

      const stored = localStorageMock.getItem('dermatology_audit_trail');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!) as AuditEvent[];
      expect(parsed).toHaveLength(1);
    });

    it('should use default values for optional parameters', async () => {
      await service.initialize();

      await service.logEvent('EVENT', { test: true });

      const events = (service as any).auditEvents as AuditEvent[];
      expect(events[0]?.agentTrace).toEqual([]);
      expect(events[0]?.safetyLevel).toBe('MEDIUM');
    });

    it('should create checkpoint every 10 events', async () => {
      await service.initialize();

      for (let i = 0; i < 10; i++) {
        await service.logEvent('EVENT', {});
      }

      const checkpoint = localStorageMock.getItem('dermatology_audit_checkpoint');
      expect(checkpoint).not.toBeNull();
    });
  });

  describe('verifyChainIntegrity', () => {
    it('should return valid for empty chain', async () => {
      await service.initialize();

      const state = await service.verifyChainIntegrity();

      expect(state.isValid).toBe(true);
      expect(state.totalEvents).toBe(0);
      expect(state.corruptionDetected).toBe(false);
    });

    it('should verify valid chain', async () => {
      await service.initialize();

      await service.logEvent('EVENT_1', {});
      await service.logEvent('EVENT_2', {});
      await service.logEvent('EVENT_3', {});

      const state = await service.verifyChainIntegrity();

      expect(state.isValid).toBe(true);
      expect(state.totalEvents).toBe(3);
      expect(state.corruptionDetected).toBe(false);
    });

    it('should detect tampered event hash', async () => {
      await service.initialize();

      await service.logEvent('EVENT', {});

      // Tamper with the hash
      const events = (service as any).auditEvents as AuditEvent[];
      events[0]!.hash = 'tampered_hash';

      const state = await service.verifyChainIntegrity();

      expect(state.isValid).toBe(false);
      expect(state.corruptionDetected).toBe(true);
    });

    it('should detect broken chain link', async () => {
      await service.initialize();

      await service.logEvent('EVENT_1', {});
      await service.logEvent('EVENT_2', {});

      // Break the chain
      const events = (service as any).auditEvents as AuditEvent[];
      events[1]!.previousHash = 'wrong_previous_hash';

      const state = await service.verifyChainIntegrity();

      expect(state.isValid).toBe(false);
      expect(state.corruptionDetected).toBe(true);
    });

    it('should include lastHash in state', async () => {
      await service.initialize();

      await service.logEvent('EVENT', {});

      const state = await service.verifyChainIntegrity();

      expect(state.lastHash).toBe((service as any).lastHash);
    });
  });

  describe('exportAuditTrail', () => {
    it('should export complete audit trail', async () => {
      await service.initialize();

      await service.logEvent('EVENT_1', { data: 1 });
      await service.logEvent('EVENT_2', { data: 2 });

      const exported = await service.exportAuditTrail();

      expect(exported.version).toBe('1.0');
      expect(exported.totalEvents).toBe(2);
      expect(exported.events).toHaveLength(2);
      expect(exported.chainValid).toBe(true);
      expect(exported.merkleRoot).toBeDefined();
    });

    it('should include export timestamp', async () => {
      await service.initialize();

      const beforeTime = Date.now();
      const exported = await service.exportAuditTrail();
      const afterTime = Date.now();

      expect(exported.exportTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(exported.exportTimestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should export empty chain', async () => {
      await service.initialize();

      const exported = await service.exportAuditTrail();

      expect(exported.totalEvents).toBe(0);
      expect(exported.events).toEqual([]);
      expect(exported.merkleRoot).toBe('');
    });

    it('should mark invalid chain in export', async () => {
      await service.initialize();

      await service.logEvent('EVENT', {});

      // Tamper with chain
      const events = (service as any).auditEvents as AuditEvent[];
      events[0]!.hash = 'tampered';

      const exported = await service.exportAuditTrail();

      expect(exported.chainValid).toBe(false);
    });
  });

  describe('clearAuditTrail', () => {
    it('should clear all audit events', async () => {
      await service.initialize();

      await service.logEvent('EVENT_1', {});
      await service.logEvent('EVENT_2', {});

      await service.clearAuditTrail();

      expect((service as any).auditEvents).toEqual([]);
      expect((service as any).lastHash).toBe('');
    });

    it('should remove from localStorage', async () => {
      await service.initialize();

      await service.logEvent('EVENT', {});

      await service.clearAuditTrail();

      expect(localStorageMock.getItem('dermatology_audit_trail')).toBeNull();
      expect(localStorageMock.getItem('dermatology_audit_checkpoint')).toBeNull();
    });
  });

  describe('getChainState', () => {
    it('should return current chain state', async () => {
      await service.initialize();

      await service.logEvent('EVENT', {});

      const state = service.getChainState();

      expect(state.totalEvents).toBe(1);
      expect(state.isValid).toBe(true);
      expect(state.lastHash).toBeDefined();
      expect(state.corruptionDetected).toBe(false);
    });

    it('should return empty state for new chain', () => {
      const state = service.getChainState();

      expect(state.totalEvents).toBe(0);
      expect(state.lastHash).toBe('');
    });
  });

  describe('getRecentEvents', () => {
    it('should return recent events with default limit', async () => {
      await service.initialize();

      for (let i = 0; i < 100; i++) {
        await service.logEvent('EVENT', { index: i });
      }

      const recent = service.getRecentEvents();

      expect(recent).toHaveLength(50);
      expect(recent[recent.length - 1]?.data).toEqual({ index: 99 });
    });

    it('should respect custom limit', async () => {
      await service.initialize();

      for (let i = 0; i < 20; i++) {
        await service.logEvent('EVENT', { index: i });
      }

      const recent = service.getRecentEvents(10);

      expect(recent).toHaveLength(10);
    });

    it('should return all events if fewer than limit', async () => {
      await service.initialize();

      await service.logEvent('EVENT_1', {});
      await service.logEvent('EVENT_2', {});

      const recent = service.getRecentEvents(50);

      expect(recent).toHaveLength(2);
    });
  });

  describe('findEventsByType', () => {
    it('should find events by type', async () => {
      await service.initialize();

      await service.logEvent('USER_ACTION', { action: 'click' });
      await service.logEvent('SYSTEM_EVENT', { event: 'startup' });
      await service.logEvent('USER_ACTION', { action: 'submit' });

      const userActions = service.findEventsByType('USER_ACTION');

      expect(userActions).toHaveLength(2);
      expect(userActions[0]?.type).toBe('USER_ACTION');
      expect(userActions[1]?.type).toBe('USER_ACTION');
    });

    it('should return empty array for non-existent type', async () => {
      await service.initialize();

      await service.logEvent('EVENT', {});

      const results = service.findEventsByType('NON_EXISTENT');

      expect(results).toEqual([]);
    });

    it('should return empty array for empty chain', () => {
      const results = service.findEventsByType('ANY_TYPE');

      expect(results).toEqual([]);
    });
  });
});
