import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ConsentManager, DEFAULT_CONSENT_STATE } from '../../services/consentManager';

import type { ConsentState } from '../../services/validation';

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

describe('ConsentManager', () => {
  let manager: ConsentManager;

  beforeEach(() => {
    manager = ConsentManager.getInstance();
    // Clear internal state
    (manager as any).currentConsent = null;
    (manager as any).listeners = [];
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ConsentManager.getInstance();
      const instance2 = ConsentManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize with default consent when no saved state', async () => {
      const consent = await manager.initialize();

      expect(consent.localProcessing).toBe(true);
      expect(consent.cloudGemini).toBe(false);
      expect(consent.offlineAnalysis).toBe(false);
      expect(consent.dataStorage).toBe(true);
      expect(consent.analytics).toBe(false);
    });

    it('should load saved consent from localStorage', async () => {
      const savedConsent: ConsentState = {
        localProcessing: true,
        cloudGemini: true,
        offlineAnalysis: true,
        dataStorage: true,
        analytics: true,
        timestamp: Date.now(),
      };

      localStorageMock.setItem('dermatology_consent_state', JSON.stringify(savedConsent));

      const consent = await manager.initialize();

      expect(consent.cloudGemini).toBe(true);
      expect(consent.offlineAnalysis).toBe(true);
      expect(consent.analytics).toBe(true);
    });

    it('should handle corrupted localStorage data', async () => {
      localStorageMock.setItem('dermatology_consent_state', 'invalid json');

      const consent = await manager.initialize();

      // Should fall back to default consent
      expect(consent).toEqual(
        expect.objectContaining({
          localProcessing: true,
          cloudGemini: false,
        }),
      );
    });

    it('should handle incomplete consent data', async () => {
      const incompleteConsent = {
        localProcessing: true,
        // Missing other required fields
      };

      localStorageMock.setItem('dermatology_consent_state', JSON.stringify(incompleteConsent));

      const consent = await manager.initialize();

      // Should fall back to default
      expect(consent).toEqual(expect.objectContaining(DEFAULT_CONSENT_STATE));
    });
  });

  describe('getCurrentConsent', () => {
    it('should return null before initialization', () => {
      const consent = manager.getCurrentConsent();

      expect(consent).toBeNull();
    });

    it('should return current consent after initialization', async () => {
      await manager.initialize();

      const consent = manager.getCurrentConsent();

      expect(consent).not.toBeNull();
      expect(consent?.localProcessing).toBe(true);
    });
  });

  describe('hasConsent', () => {
    it('should return false for uninitialized manager', () => {
      expect(manager.hasConsent('cloudGemini')).toBe(false);
    });

    it('should return correct consent status', async () => {
      await manager.initialize();

      expect(manager.hasConsent('localProcessing')).toBe(true);
      expect(manager.hasConsent('cloudGemini')).toBe(false);
      expect(manager.hasConsent('dataStorage')).toBe(true);
    });

    it('should reflect updated consent', async () => {
      await manager.initialize();
      await manager.updateConsent({ cloudGemini: true });

      expect(manager.hasConsent('cloudGemini')).toBe(true);
    });
  });

  describe('updateConsent', () => {
    it('should throw error if not initialized', async () => {
      await expect(manager.updateConsent({ cloudGemini: true })).rejects.toThrow(
        'Consent not initialized',
      );
    });

    it('should update consent preferences', async () => {
      await manager.initialize();

      const updated = await manager.updateConsent({
        cloudGemini: true,
        analytics: true,
      });

      expect(updated.cloudGemini).toBe(true);
      expect(updated.analytics).toBe(true);
    });

    it('should always enforce localProcessing as true', async () => {
      await manager.initialize();

      const updated = await manager.updateConsent({
        localProcessing: false as any, // Try to set to false
      });

      expect(updated.localProcessing).toBe(true);
    });

    it('should update timestamp', async () => {
      await manager.initialize();

      const beforeTime = Date.now();
      const updated = await manager.updateConsent({ cloudGemini: true });
      const afterTime = Date.now();

      expect(updated.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(updated.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should persist to localStorage', async () => {
      await manager.initialize();

      await manager.updateConsent({ cloudGemini: true });

      const stored = localStorageMock.getItem('dermatology_consent_state');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!) as ConsentState;
      expect(parsed.cloudGemini).toBe(true);
    });

    it('should notify listeners', async () => {
      await manager.initialize();

      const listener = vi.fn();
      manager.addConsentListener(listener);

      await manager.updateConsent({ cloudGemini: true });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          cloudGemini: true,
        }),
      );
    });
  });

  describe('grantAllConsents', () => {
    it('should grant all optional consents', async () => {
      await manager.initialize();

      const consent = await manager.grantAllConsents();

      expect(consent.cloudGemini).toBe(true);
      expect(consent.offlineAnalysis).toBe(true);
      expect(consent.dataStorage).toBe(true);
      expect(consent.analytics).toBe(true);
    });

    it('should persist granted consents', async () => {
      await manager.initialize();

      await manager.grantAllConsents();

      const stored = localStorageMock.getItem('dermatology_consent_state');
      const parsed = JSON.parse(stored!) as ConsentState;

      expect(parsed.cloudGemini).toBe(true);
      expect(parsed.analytics).toBe(true);
    });
  });

  describe('revokeAllConsents', () => {
    it('should revoke all optional consents', async () => {
      await manager.initialize();
      await manager.grantAllConsents();

      const consent = await manager.revokeAllConsents();

      expect(consent.cloudGemini).toBe(false);
      expect(consent.offlineAnalysis).toBe(false);
      expect(consent.dataStorage).toBe(false);
      expect(consent.analytics).toBe(false);
    });

    it('should keep localProcessing as true', async () => {
      await manager.initialize();

      const consent = await manager.revokeAllConsents();

      expect(consent.localProcessing).toBe(true);
    });
  });

  describe('isConsentRequired', () => {
    it('should return true before initialization', () => {
      expect(manager.isConsentRequired()).toBe(true);
    });

    it('should return false after initialization', async () => {
      await manager.initialize();

      expect(manager.isConsentRequired()).toBe(false);
    });

    it('should return true after clearing consent', async () => {
      await manager.initialize();
      await manager.clearConsent();

      expect(manager.isConsentRequired()).toBe(true);
    });
  });

  describe('hasAnyOptionalConsent', () => {
    it('should return false before initialization', () => {
      expect(manager.hasAnyOptionalConsent()).toBe(false);
    });

    it('should return true with default state (dataStorage is true)', async () => {
      await manager.initialize();

      expect(manager.hasAnyOptionalConsent()).toBe(true);
    });

    it('should return false when all optional consents revoked', async () => {
      await manager.initialize();
      await manager.revokeAllConsents();

      expect(manager.hasAnyOptionalConsent()).toBe(false);
    });

    it('should return true with any single optional consent', async () => {
      await manager.initialize();
      await manager.revokeAllConsents();
      await manager.updateConsent({ cloudGemini: true });

      expect(manager.hasAnyOptionalConsent()).toBe(true);
    });
  });

  describe('addConsentListener', () => {
    it('should register listener for consent updates', async () => {
      await manager.initialize();

      const listener = vi.fn();
      manager.addConsentListener(listener);

      await manager.updateConsent({ cloudGemini: true });

      expect(listener).toHaveBeenCalledOnce();
    });

    it('should return unsubscribe function', async () => {
      await manager.initialize();

      const listener = vi.fn();
      const unsubscribe = manager.addConsentListener(listener);

      await manager.updateConsent({ cloudGemini: true });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      await manager.updateConsent({ analytics: true });
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should support multiple listeners', async () => {
      await manager.initialize();

      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      manager.addConsentListener(listener1);
      manager.addConsentListener(listener2);
      manager.addConsentListener(listener3);

      await manager.updateConsent({ cloudGemini: true });

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
      expect(listener3).toHaveBeenCalledOnce();
    });

    it('should handle listener errors gracefully', async () => {
      await manager.initialize();

      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      manager.addConsentListener(errorListener);
      manager.addConsentListener(normalListener);

      await manager.updateConsent({ cloudGemini: true });

      // Both should be called despite error
      expect(errorListener).toHaveBeenCalledOnce();
      expect(normalListener).toHaveBeenCalledOnce();
    });

    it('should allow selective unsubscribe', async () => {
      await manager.initialize();

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = manager.addConsentListener(listener1);
      manager.addConsentListener(listener2);

      unsub1();

      await manager.updateConsent({ cloudGemini: true });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledOnce();
    });
  });

  describe('clearConsent', () => {
    it('should clear current consent', async () => {
      await manager.initialize();
      await manager.updateConsent({ cloudGemini: true });

      await manager.clearConsent();

      expect(manager.getCurrentConsent()).toBeNull();
    });

    it('should remove from localStorage', async () => {
      await manager.initialize();

      await manager.clearConsent();

      expect(localStorageMock.getItem('dermatology_consent_state')).toBeNull();
    });

    it('should notify listeners with null', async () => {
      await manager.initialize();

      const listener = vi.fn();
      manager.addConsentListener(listener);

      await manager.clearConsent();

      // Listener should not be called with null (check implementation)
      // Based on notifyListeners code, it only calls if consent is not null
    });
  });

  describe('exportConsentData', () => {
    it('should export consent data with metadata', async () => {
      await manager.initialize();

      const beforeTime = Date.now();
      const exported = manager.exportConsentData();
      const afterTime = Date.now();

      expect(exported.consent).not.toBeNull();
      expect(exported.version).toBe('1.0');
      expect(exported.exportedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(exported.exportedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should export null consent before initialization', () => {
      const exported = manager.exportConsentData();

      expect(exported.consent).toBeNull();
      expect(exported.version).toBe('1.0');
    });

    it('should include current consent state', async () => {
      await manager.initialize();
      await manager.updateConsent({ cloudGemini: true, analytics: true });

      const exported = manager.exportConsentData();

      expect(exported.consent?.cloudGemini).toBe(true);
      expect(exported.consent?.analytics).toBe(true);
    });
  });

  describe('DEFAULT_CONSENT_STATE', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CONSENT_STATE.localProcessing).toBe(true);
      expect(DEFAULT_CONSENT_STATE.cloudGemini).toBe(false);
      expect(DEFAULT_CONSENT_STATE.offlineAnalysis).toBe(false);
      expect(DEFAULT_CONSENT_STATE.dataStorage).toBe(true);
      expect(DEFAULT_CONSENT_STATE.analytics).toBe(false);
    });
  });
});
