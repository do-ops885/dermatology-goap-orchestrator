import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Logger } from '../../services/logger';
import { NotificationService } from '../../services/notifications';

// Mock dependencies
vi.mock('../../services/logger', () => ({
  Logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../services/agentDB', () => ({
  default: {
    getInstance: vi.fn().mockReturnValue({
      logAuditEvent: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = NotificationService.getInstance();
    // Clear internal state by accessing private properties (for testing purposes)
    (service as any).notifications = [];
    (service as any).listeners = new Set();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = NotificationService.getInstance();
      const instance2 = NotificationService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should always return the same instance across multiple calls', () => {
      const instances = Array.from({ length: 5 }, () => NotificationService.getInstance());

      instances.forEach((instance, index) => {
        if (index > 0) {
          expect(instance).toBe(instances[0]);
        }
      });
    });
  });

  describe('sendCriticalAlert', () => {
    it('should create and return a critical notification', async () => {
      const params = {
        analysisId: 'analysis_123',
        triggerReason: 'High melanoma probability detected',
        diagnosis: 'Melanoma',
        riskLevel: 'High',
        patientId: 'patient_456',
      };

      const notification = await service.sendCriticalAlert(params);

      expect(notification).toBeDefined();
      expect(notification.id).toMatch(/^notif_/);
      expect(notification.safetyLevel).toBe('HIGH');
      expect(notification.analysisId).toBe(params.analysisId);
      expect(notification.patientId).toBe(params.patientId);
      expect(notification.triggerReason).toBe(params.triggerReason);
      expect(notification.diagnosis).toBe(params.diagnosis);
      expect(notification.riskLevel).toBe(params.riskLevel);
      expect(notification.status).toBe('pending');
      expect(notification.actions).toEqual([]);
    });

    it('should log error via Logger', async () => {
      const params = {
        analysisId: 'analysis_123',
        triggerReason: 'Test alert',
      };

      await service.sendCriticalAlert(params);

      expect(Logger.error).toHaveBeenCalledWith(
        'ClinicianNotification',
        'CRITICAL_ALERT',
        expect.objectContaining({
          analysisId: params.analysisId,
          triggerReason: params.triggerReason,
        }),
      );
    });

    it('should notify all registered listeners', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      service.onNotification(listener1);
      service.onNotification(listener2);

      const params = {
        analysisId: 'analysis_789',
        triggerReason: 'Urgent review needed',
      };

      const notification = await service.sendCriticalAlert(params);

      expect(listener1).toHaveBeenCalledWith(notification);
      expect(listener2).toHaveBeenCalledWith(notification);
    });

    it('should handle optional parameters', async () => {
      const params = {
        analysisId: 'analysis_minimal',
        triggerReason: 'Test',
      };

      const notification = await service.sendCriticalAlert(params);

      expect(notification.diagnosis).toBeUndefined();
      expect(notification.riskLevel).toBeUndefined();
      expect(notification.patientId).toBeUndefined();
    });

    it('should generate unique notification IDs', async () => {
      const params = {
        analysisId: 'analysis_123',
        triggerReason: 'Test',
      };

      const notification1 = await service.sendCriticalAlert(params);
      const notification2 = await service.sendCriticalAlert(params);

      expect(notification1.id).not.toBe(notification2.id);
    });

    it('should set timestamp on notification', async () => {
      const beforeTime = Date.now();

      const notification = await service.sendCriticalAlert({
        analysisId: 'test',
        triggerReason: 'test',
      });

      const afterTime = Date.now();

      expect(notification.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(notification.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should add notification to internal list', async () => {
      const params = {
        analysisId: 'analysis_list',
        triggerReason: 'Test',
      };

      await service.sendCriticalAlert(params);

      const pending = service.getPendingNotifications();
      expect(pending).toHaveLength(1);
      expect(pending[0]?.analysisId).toBe(params.analysisId);
    });
  });

  describe('acknowledgeNotification', () => {
    it('should acknowledge a notification', async () => {
      const notification = await service.sendCriticalAlert({
        analysisId: 'analysis_ack',
        triggerReason: 'Test',
      });

      service.acknowledgeNotification(notification.id, 'clinician_123', 'Reviewed and approved');

      const pending = service.getPendingNotifications();
      expect(pending).toHaveLength(0);
    });

    it('should update notification status to acknowledged', async () => {
      const notification = await service.sendCriticalAlert({
        analysisId: 'analysis_status',
        triggerReason: 'Test',
      });

      expect(notification.status).toBe('pending');

      service.acknowledgeNotification(notification.id, 'clinician_456');

      expect(notification?.status).toBe('acknowledged');
    });

    it('should add action to notification', async () => {
      const notification = await service.sendCriticalAlert({
        analysisId: 'analysis_action',
        triggerReason: 'Test',
      });

      const beforeAck = Date.now();
      service.acknowledgeNotification(notification.id, 'clinician_789', 'All clear');
      const afterAck = Date.now();

      expect(notification.actions).toHaveLength(1);
      expect(notification.actions[0]?.type).toBe('review');
      expect(notification.actions[0]?.clinicianId).toBe('clinician_789');
      expect(notification.actions[0]?.notes).toBe('All clear');
      expect(notification.actions[0]?.timestamp).toBeGreaterThanOrEqual(beforeAck);
      expect(notification.actions[0]?.timestamp).toBeLessThanOrEqual(afterAck);
    });

    it('should handle acknowledgement without notes', async () => {
      const notification = await service.sendCriticalAlert({
        analysisId: 'analysis_no_notes',
        triggerReason: 'Test',
      });

      service.acknowledgeNotification(notification.id, 'clinician_000');

      expect(notification.actions[0]?.notes).toBeUndefined();
    });

    it('should do nothing for non-existent notification', () => {
      expect(() => {
        service.acknowledgeNotification('nonexistent_id', 'clinician_123');
      }).not.toThrow();
    });

    it('should allow multiple acknowledgements', async () => {
      const notification = await service.sendCriticalAlert({
        analysisId: 'analysis_multiple',
        triggerReason: 'Test',
      });

      service.acknowledgeNotification(notification.id, 'clinician_1', 'First review');
      service.acknowledgeNotification(notification.id, 'clinician_2', 'Second review');

      expect(notification.actions).toHaveLength(2);
    });
  });

  describe('getPendingNotifications', () => {
    it('should return empty array when no notifications', () => {
      const pending = service.getPendingNotifications();
      expect(pending).toEqual([]);
    });

    it('should return only pending notifications', async () => {
      const notif1 = await service.sendCriticalAlert({
        analysisId: 'a1',
        triggerReason: 'test1',
      });

      const notif2 = await service.sendCriticalAlert({
        analysisId: 'a2',
        triggerReason: 'test2',
      });

      const notif3 = await service.sendCriticalAlert({
        analysisId: 'a3',
        triggerReason: 'test3',
      });

      service.acknowledgeNotification(notif2.id, 'clinician_123');

      const pending = service.getPendingNotifications();

      expect(pending).toHaveLength(2);
      expect(pending.map((n) => n.id)).toContain(notif1.id);
      expect(pending.map((n) => n.id)).toContain(notif3.id);
      expect(pending.map((n) => n.id)).not.toContain(notif2.id);
    });

    it('should return all notifications when none acknowledged', async () => {
      await service.sendCriticalAlert({ analysisId: 'a1', triggerReason: 't1' });
      await service.sendCriticalAlert({ analysisId: 'a2', triggerReason: 't2' });
      await service.sendCriticalAlert({ analysisId: 'a3', triggerReason: 't3' });

      const pending = service.getPendingNotifications();
      expect(pending).toHaveLength(3);
    });

    it('should return empty when all acknowledged', async () => {
      const n1 = await service.sendCriticalAlert({ analysisId: 'a1', triggerReason: 't1' });
      const n2 = await service.sendCriticalAlert({ analysisId: 'a2', triggerReason: 't2' });

      service.acknowledgeNotification(n1.id, 'clinician');
      service.acknowledgeNotification(n2.id, 'clinician');

      const pending = service.getPendingNotifications();
      expect(pending).toEqual([]);
    });
  });

  describe('onNotification', () => {
    it('should register a listener and receive notifications', async () => {
      const listener = vi.fn();
      service.onNotification(listener);

      const notification = await service.sendCriticalAlert({
        analysisId: 'test',
        triggerReason: 'test',
      });

      expect(listener).toHaveBeenCalledWith(notification);
    });

    it('should return unsubscribe function', async () => {
      const listener = vi.fn();
      const unsubscribe = service.onNotification(listener);

      await service.sendCriticalAlert({ analysisId: 'a1', triggerReason: 't1' });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      await service.sendCriticalAlert({ analysisId: 'a2', triggerReason: 't2' });
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should support multiple listeners', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      service.onNotification(listener1);
      service.onNotification(listener2);
      service.onNotification(listener3);

      await service.sendCriticalAlert({ analysisId: 'test', triggerReason: 'test' });

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
      expect(listener3).toHaveBeenCalledOnce();
    });

    it('should allow selective unsubscribe', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = service.onNotification(listener1);
      service.onNotification(listener2);

      unsub1();

      await service.sendCriticalAlert({ analysisId: 'test', triggerReason: 'test' });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledOnce();
    });

    it('should handle unsubscribe called multiple times', () => {
      const listener = vi.fn();
      const unsubscribe = service.onNotification(listener);

      expect(() => {
        unsubscribe();
        unsubscribe();
        unsubscribe();
      }).not.toThrow();
    });
  });
});
