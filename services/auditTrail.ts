/**
 * Enhanced Audit Trail Service
 * Provides immutable, append-only logging with tamper detection.
 */

import { CryptoService } from './crypto';

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: string;
  data: Record<string, unknown>;
  hash: string;
  previousHash: string;
  agentTrace: string[];
  safetyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AuditChainState {
  isValid: boolean;
  lastHash: string;
  totalEvents: number;
  corruptionDetected: boolean;
}

const AUDIT_STORAGE_KEY = 'dermatology_audit_trail';
const AUDIT_CHECKPOINT_KEY = 'dermatology_audit_checkpoint';

export class AuditTrailService {
  private static instance: AuditTrailService;
  private auditEvents: AuditEvent[] = [];
  private lastHash: string = '';
  private isInitialized = false;

  public static getInstance(): AuditTrailService {
    AuditTrailService.instance ??= new AuditTrailService();
    return AuditTrailService.instance;
  }

  /**
   * Initialize the audit trail service and load existing chain.
   */
  public async initialize(): Promise<AuditChainState> {
    if (this.isInitialized) {
      return this.getChainState();
    }

    try {
      await this.loadAuditChain();
      this.isInitialized = true;
      return this.getChainState();
    } catch (error) {
      console.error('Failed to initialize audit trail:', error);
      return {
        isValid: false,
        lastHash: '',
        totalEvents: 0,
        corruptionDetected: true,
      };
    }
  }

  /**
   * Log a new audit event with immutable hash chaining.
   */
  public async logEvent(
    type: string,
    data: Record<string, unknown>,
    agentTrace: string[] = [],
    safetyLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM',
  ): Promise<string> {
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      data,
      agentTrace,
      safetyLevel,
      previousHash: this.lastHash,
      hash: '', // Will be calculated
    };

    // Calculate hash for this event
    event.hash = await this.calculateEventHash(event);

    // Add to chain
    this.auditEvents.push(event);
    this.lastHash = event.hash;

    // Persist to storage
    await this.persistAuditChain();

    return event.id;
  }

  /**
   * Verify the integrity of the audit chain.
   */
  public async verifyChainIntegrity(): Promise<AuditChainState> {
    if (this.auditEvents.length === 0) {
      return {
        isValid: true,
        lastHash: '',
        totalEvents: 0,
        corruptionDetected: false,
      };
    }

    try {
      for (let i = 0; i < this.auditEvents.length; i++) {
        const event = this.auditEvents[i];
        if (!event) continue;
        
        const expectedHash = await this.calculateEventHash(event);

        if (event.hash !== expectedHash) {
          return {
            isValid: false,
            lastHash: this.lastHash,
            totalEvents: this.auditEvents.length,
            corruptionDetected: true,
          };
        }

        // Verify hash chain
        if (i > 0) {
          const previousEvent = this.auditEvents[i - 1];
          if (!previousEvent) continue;
          if (event.previousHash !== previousEvent.hash) {
            return {
              isValid: false,
              lastHash: this.lastHash,
              totalEvents: this.auditEvents.length,
              corruptionDetected: true,
            };
          }
        }
      }

      return {
        isValid: true,
        lastHash: this.lastHash,
        totalEvents: this.auditEvents.length,
        corruptionDetected: false,
      };
    } catch (error) {
      console.error('Audit chain verification failed:', error);
      return {
        isValid: false,
        lastHash: this.lastHash,
        totalEvents: this.auditEvents.length,
        corruptionDetected: true,
      };
    }
  }

  /**
   * Export audit trail for compliance or external verification.
   */
  public async exportAuditTrail(): Promise<{
    exportTimestamp: number;
    version: string;
    totalEvents: number;
    chainValid: boolean;
    events: AuditEvent[];
    merkleRoot: string;
  }> {
    const chainState = await this.verifyChainIntegrity();
    const merkleRoot = await this.calculateMerkleRoot();

    return {
      exportTimestamp: Date.now(),
      version: '1.0',
      totalEvents: this.auditEvents.length,
      chainValid: chainState.isValid,
      events: [...this.auditEvents],
      merkleRoot,
    };
  }

  /**
   * Clear all audit data (for GDPR compliance).
   */
  public async clearAuditTrail(): Promise<void> {
    this.auditEvents = [];
    this.lastHash = '';

    try {
      localStorage.removeItem(AUDIT_STORAGE_KEY);
      localStorage.removeItem(AUDIT_CHECKPOINT_KEY);
    } catch (error) {
      console.error('Failed to clear audit trail from storage:', error);
    }
  }

  /**
   * Get current chain state.
   */
  public getChainState(): AuditChainState {
    return {
      isValid: this.auditEvents.length > 0,
      lastHash: this.lastHash,
      totalEvents: this.auditEvents.length,
      corruptionDetected: false,
    };
  }

  /**
   * Get recent audit events.
   */
  public getRecentEvents(limit: number = 50): AuditEvent[] {
    return this.auditEvents.slice(-limit);
  }

  /**
   * Find audit events by type.
   */
  public findEventsByType(type: string): AuditEvent[] {
    return this.auditEvents.filter((event) => event.type === type);
  }

  private async loadAuditChain(): Promise<void> {
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (!stored || stored.length === 0) {
        return; // No existing chain
      }

      const parsed = JSON.parse(stored) as unknown;

      if (!Array.isArray(parsed)) {
        throw new Error('Invalid audit trail format');
      }

      this.auditEvents = parsed as AuditEvent[];

      if (this.auditEvents.length > 0) {
        const lastEvent = this.auditEvents[this.auditEvents.length - 1];
        this.lastHash = lastEvent?.hash ?? '';
      }

      // Verify integrity on load
      const chainState = await this.verifyChainIntegrity();
      if (!chainState.isValid) {
        console.warn('Audit chain corruption detected on load');
      }
    } catch (error) {
      console.error('Failed to load audit chain:', error);
      // Initialize fresh chain on error
      this.auditEvents = [];
      this.lastHash = '';
    }
  }

  private async persistAuditChain(): Promise<void> {
    try {
      // Create checkpoint periodically
      if (this.auditEvents.length % 10 === 0) {
        localStorage.setItem(
          AUDIT_CHECKPOINT_KEY,
          JSON.stringify({
            lastHash: this.lastHash,
            eventCount: this.auditEvents.length,
            timestamp: Date.now(),
          }),
        );
      }

      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(this.auditEvents));
    } catch (error) {
      console.error('Failed to persist audit chain:', error);
    }
  }

  private async calculateEventHash(event: Omit<AuditEvent, 'hash'>): Promise<string> {
    // Create a canonical string representation of the event
    const eventString = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      data: event.data,
      agentTrace: event.agentTrace,
      safetyLevel: event.safetyLevel,
      previousHash: event.previousHash,
    });

    return CryptoService.generateHash(eventString);
  }

  private async calculateMerkleRoot(): Promise<string> {
    if (this.auditEvents.length === 0) {
      return '';
    }

    const hashes = this.auditEvents.map((event) => event.hash);

    while (hashes.length > 1) {
      const newHashes: string[] = [];

      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] ?? hashes[i]; // Handle odd number

        if (!left || !right) continue;
        const combined = await CryptoService.generateHash(left + right);
        newHashes.push(combined);
      }

      hashes.splice(0, hashes.length, ...newHashes);
    }

    return hashes[0] ?? '';
  }
}

export const AuditTrailInstance = AuditTrailService.getInstance();
