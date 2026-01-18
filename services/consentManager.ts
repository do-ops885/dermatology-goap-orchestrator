/**
 * Consent Management Service
 * Handles granular user consent for data processing and storage.
 */

import type { ConsentState } from './validation';

export const DEFAULT_CONSENT_STATE: ConsentState = {
  localProcessing: true, // Always true - required for app functionality
  cloudGemini: false, // User must opt-in for cloud skin tone detection
  offlineAnalysis: false, // User must opt-in for offline-only mode
  dataStorage: true, // Default true for IndexedDB storage
  analytics: false, // Default false for anonymous telemetry
  timestamp: Date.now(),
};

const CONSENT_STORAGE_KEY = 'dermatology_consent_state';
const CONSENT_VERSION = '1.0';

export class ConsentManager {
  private static instance: ConsentManager;
  private currentConsent: ConsentState | null = null;
  private listeners: ((_consentState: ConsentState) => void)[] = [];

  public static getInstance(): ConsentManager {
    ConsentManager.instance ??= new ConsentManager();
    return ConsentManager.instance;
  }

  /**
   * Initialize consent manager and load saved consent state.
   */
  public async initialize(): Promise<ConsentState> {
    const savedConsent = this.loadConsentFromStorage();

    if (savedConsent) {
      this.currentConsent = savedConsent;
    } else {
      // No saved consent - user needs to provide it
      this.currentConsent = { ...DEFAULT_CONSENT_STATE };
    }

    return this.currentConsent;
  }

  /**
   * Get current consent state.
   */
  public getCurrentConsent(): ConsentState | null {
    return this.currentConsent;
  }

  /**
   * Check if user has provided consent for a specific purpose.
   */
  public hasConsent(purpose: keyof Omit<ConsentState, 'timestamp' | 'userId'>): boolean {
    if (!this.currentConsent) {
      return false;
    }
    return this.currentConsent[purpose];
  }

  /**
   * Update consent state with new preferences.
   */
  public async updateConsent(
    updates: Partial<Omit<ConsentState, 'timestamp' | 'userId'>>,
  ): Promise<ConsentState> {
    if (!this.currentConsent) {
      throw new Error('Consent not initialized. Call initialize() first.');
    }

    // Enforce that localProcessing is always true
    const validatedUpdates = {
      ...updates,
      localProcessing: true, // Always required
    };

    this.currentConsent = {
      ...this.currentConsent,
      ...validatedUpdates,
      timestamp: Date.now(),
    };

    await this.saveConsentToStorage(this.currentConsent);
    this.notifyListeners(this.currentConsent);

    return this.currentConsent;
  }

  /**
   * Grant all non-required consents (for testing purposes).
   */
  public async grantAllConsents(): Promise<ConsentState> {
    return this.updateConsent({
      cloudGemini: true,
      offlineAnalysis: true,
      dataStorage: true,
      analytics: true,
    });
  }

  /**
   * Revoke all non-required consents.
   */
  public async revokeAllConsents(): Promise<ConsentState> {
    return this.updateConsent({
      cloudGemini: false,
      offlineAnalysis: false,
      dataStorage: false, // This will disable IndexedDB storage
      analytics: false,
    });
  }

  /**
   * Check if consent is required (first-time user).
   */
  public isConsentRequired(): boolean {
    return this.currentConsent === null;
  }

  /**
   * Check if consent has been given for any optional processing.
   */
  public hasAnyOptionalConsent(): boolean {
    if (!this.currentConsent) {
      return false;
    }
    return (
      this.currentConsent.cloudGemini ||
      this.currentConsent.offlineAnalysis ||
      this.currentConsent.dataStorage ||
      this.currentConsent.analytics
    );
  }

  /**
   * Register listener for consent changes.
   */
  public addConsentListener(listener: (_consentState: ConsentState) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Clear all consent data (for GDPR right to erasure).
   */
  public async clearConsent(): Promise<void> {
    this.currentConsent = null;

    // Remove from localStorage
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to remove consent from localStorage:', error);
    }

    this.notifyListeners(this.currentConsent);
  }

  /**
   * Export consent state for audit purposes.
   */
  public exportConsentData(): {
    consent: ConsentState | null;
    version: string;
    exportedAt: number;
  } {
    return {
      consent: this.currentConsent,
      version: CONSENT_VERSION,
      exportedAt: Date.now(),
    };
  }

  private loadConsentFromStorage(): ConsentState | null {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored === null || stored.length === 0) {
        return null;
      }

      const parsed = JSON.parse(stored) as unknown;

      // Basic validation of stored consent
      if (parsed === null || typeof parsed !== 'object') {
        return null;
      }

      // Validate required fields
      const requiredFields = [
        'localProcessing',
        'cloudGemini',
        'offlineAnalysis',
        'dataStorage',
        'analytics',
      ];
      for (const field of requiredFields) {
        if (!(field in parsed) || typeof (parsed as Record<string, unknown>)[field] !== 'boolean') {
          console.warn(`Invalid consent data: missing or invalid ${field}`);
          return null;
        }
      }

      return parsed as ConsentState;
    } catch (error) {
      console.warn('Failed to load consent from storage:', error);
      return null;
    }
  }

  private async saveConsentToStorage(consent: ConsentState): Promise<void> {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    } catch (error) {
      console.error('Failed to save consent to storage:', error);
      throw new Error('Failed to persist consent preferences');
    }
  }

  private notifyListeners(consent: ConsentState | null): void {
    for (const listener of this.listeners) {
      try {
        if (consent) {
          listener(consent);
        }
      } catch (error) {
        console.error('Error in consent listener:', error);
      }
    }
  }
}

export const ConsentManagerInstance = ConsentManager.getInstance();
