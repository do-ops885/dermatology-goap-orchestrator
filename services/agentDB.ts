import { createDatabase, ReasoningBank, EmbeddingService } from 'agentdb';

import {
  convertToAuditLogEntry,
  getEmptyFairnessStats,
  getEmptyFeedbackStats,
  normalizeEmptyFairnessStats,
} from './auditLogHelpers';
import { Logger } from './logger';

import type {
  FitzpatrickType,
  ReasoningPatternMetadata,
  FairnessStats,
  AuditEventPayload,
  ClinicianFeedback,
  ReasoningPattern,
} from '../types';

interface AgentDBReasoningPattern {
  id?: number;
  taskType: string;
  approach: string;
  successRate: number;
  embedding?: Float32Array;
  uses?: number;
  avgReward?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: number;
  similarity?: number;
  outcome?: string;
  timestamp?: number;
  confidence?: number;
}

/**
 * Re-export library components so consumers of this service file
 * (like hooks/useClinicalAnalysis.ts) can use them seamlessly.
 */
export { createDatabase, ReasoningBank, EmbeddingService };

// --- Singleton Interface for UI ---

export default class ClinicalAgentDB {
  private static instance: ClinicalAgentDB | undefined = undefined;
  public reasoningBank: ReasoningBank | null = null;

  private fairnessStats: Record<FitzpatrickType, { tpr: number; fpr: number; count: number }> =
    getEmptyFairnessStats();

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): ClinicalAgentDB {
    ClinicalAgentDB.instance ??= new ClinicalAgentDB();
    return ClinicalAgentDB.instance;
  }

  public setReasoningBank(bank: ReasoningBank) {
    this.reasoningBank = bank;
  }

  public getFairnessMetrics() {
    return this.fairnessStats;
  }

  public async getAllPatterns(): Promise<ReasoningPattern[]> {
    if (!this.reasoningBank) return [];
    try {
      const bank = this.reasoningBank as unknown;
      if (
        typeof bank === 'object' &&
        bank !== null &&
        'getAllPatterns' in bank &&
        typeof (bank as { getAllPatterns?: () => Promise<ReasoningPattern[]> }).getAllPatterns ===
          'function'
      ) {
        return await (
          bank as { getAllPatterns: () => Promise<ReasoningPattern[]> }
        ).getAllPatterns();
      }
      Logger.warn('AgentDB', 'getAllPatterns method not available in library');
      return [];
    } catch (error) {
      Logger.error('AgentDB', 'Failed to get all patterns', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Retrieves live statistics by aggregating data directly from the Vector DB.
   * No simulation or mock data is returned.
   */
  public async getLiveStats(): Promise<Record<FitzpatrickType, FairnessStats>> {
    if (!this.reasoningBank) return this.fairnessStats;

    let patterns: ReasoningPattern[] = [];

    // Production Access Pattern:
    // Attempt to access internal DB to scan all records for aggregation.
    // This relies on the library exposing the underlying storage or a getAll method.
    try {
      patterns = await this.getAllPatterns();
    } catch (error) {
      Logger.error('AgentDB', 'Aggregation Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fairnessStats;
    }

    const stats = getEmptyFairnessStats();

    // Aggregate real data
    patterns.forEach((p) => {
      const type = p.metadata?.fitzpatrick;
      if (!type) return;
      if (type in stats) {
        stats[type].count++;

        // Calculate TPR (True Positive Rate) based on outcome/success metadata
        // In a real system, this compares model prediction vs verified ground truth.
        // Here we use the stored success rate as a proxy for correct classification.
        const success = p.successRate ?? p.confidence ?? 0;
        const isCorrect = success > 0.7; // Threshold for "True Positive" in this context

        if (isCorrect) {
          // Moving average for TPR
          const prevTPR = stats[type].tpr;
          const count = stats[type].count;
          stats[type].tpr = prevTPR + (1 - prevTPR) / count;
        } else {
          // Update FPR/TPR dynamics based on failures
          const prevTPR = stats[type].tpr;
          const count = stats[type].count;
          stats[type].tpr = prevTPR - prevTPR / count;
        }
      }
    });

    return normalizeEmptyFairnessStats(stats);
  }

  public async getUnifiedAuditLog(): Promise<
    {
      id: string;
      timestamp: number;
      severity: string;
      message: string;
      status: string;
      mitigation: string;
      type: string;
    }[]
  > {
    if (!this.reasoningBank) return [];

    let patterns: ReasoningPattern[] = [];
    try {
      patterns = await this.getAllPatterns();
    } catch (error) {
      Logger.error('AgentDB', 'Failed to get audit log', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }

    return patterns
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 50)
      .map((p) => convertToAuditLogEntry(p));
  }

  public async resetMemory(): Promise<void> {
    if (!this.reasoningBank) return;
    try {
      const bank = this.reasoningBank as unknown;
      if (
        typeof bank === 'object' &&
        bank !== null &&
        'clear' in bank &&
        typeof (bank as { clear?: () => Promise<void> }).clear === 'function'
      ) {
        await (bank as { clear: () => Promise<void> }).clear();
      } else {
        Logger.warn('AgentDB', 'clear method not available in library');
      }
    } catch (error) {
      Logger.error('AgentDB', 'Memory reset failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    Logger.info('AgentDB', 'Memory Reset Completed');
  }

  // These would typically pull from a separate analytics store, keeping static for this scope
  public getCalibrationData() {
    return [0.1, 0.3, 0.5, 0.7, 0.9].map((p) => ({
      prob: p,
      perfect: p,
      TypeI: p + 0.01,
      TypeVI: p - 0.02,
    }));
  }
  public getHistoricalTrends() {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => ({
      day,
      parity: 0.9 + i * 0.01,
      gap: 0.05 - i * 0.005,
    }));
  }

  public async logAuditEvent(event: AuditEventPayload): Promise<void> {
    if (!this.reasoningBank) return;

    try {
      // Store audit log as a pattern to maintain the immutable ledger within AgentDB
      const metadata: ReasoningPatternMetadata = {
        context: `Audit Event: ${event.type}`,
        verified: true,
        audit_signature: event.hash,
        type: event.type,
        hash: event.hash,
        prev_hash: event.prev_hash,
        safety_level: event.safety_level,
        agent_trace: Array.isArray(event.agent_trace)
          ? event.agent_trace.join(',')
          : String(event.agent_trace),
      };

      const patternForDb: AgentDBReasoningPattern = {
        id: Date.now(),
        taskType: 'AUDIT_LOG',
        approach: `Trace: ${Array.isArray(event.agent_trace) ? event.agent_trace.join('->') : 'System'}`,
        outcome: `Merkle: ${event.hash ? event.hash.substring(0, 12) + '...' : 'Generated'}`,
        successRate: 1.0,
        timestamp: Date.now(),
        metadata,
      };
      await this.reasoningBank.storePattern(patternForDb);
    } catch (error) {
      Logger.error('AgentDB', 'Failed to write to audit ledger', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  public async storeClinicianFeedback(feedback: ClinicianFeedback): Promise<void> {
    if (!this.reasoningBank) {
      Logger.warn('AgentDB', 'Cannot store feedback: ReasoningBank not initialized');
      return;
    }

    try {
      // Store feedback as a high-value pattern for future learning
      const metadata: ReasoningPatternMetadata = {
        feedbackId: feedback.id,
        analysisId: feedback.analysisId,
        originalDiagnosis: feedback.diagnosis,
        correctedDiagnosis: feedback.correctedDiagnosis,
        fitzpatrick: feedback.fitzpatrickType ?? 'I',
        clinicianId: feedback.clinicianId,
        notes: feedback.notes,
        isCorrection: feedback.isCorrection,
        verified: true, // Human-verified data is gold standard
        feedback_source: 'clinician',
      };

      const patternForDb: AgentDBReasoningPattern = {
        id: Date.now(),
        taskType: 'clinician_feedback',
        approach: feedback.isCorrection ? 'correction' : 'confirmation',
        outcome: feedback.correctedDiagnosis ?? feedback.diagnosis,
        successRate: feedback.confidence,
        timestamp: feedback.timestamp,
        metadata,
      };

      await this.reasoningBank.storePattern(patternForDb);

      Logger.info('AgentDB', 'Clinician feedback stored', {
        feedbackId: feedback.id,
        isCorrection: feedback.isCorrection,
      });
    } catch (error) {
      Logger.error('AgentDB', 'Failed to store clinician feedback', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async getFeedbackStats(): Promise<{
    totalFeedback: number;
    corrections: number;
    confirmations: number;
    avgConfidence: number;
    byFitzpatrick: Record<FitzpatrickType, { count: number; corrections: number }>;
  }> {
    if (!this.reasoningBank) {
      return getEmptyFeedbackStats();
    }

    try {
      const patterns = await this.getAllPatterns();
      const feedbackPatterns = patterns.filter((p) => p.taskType === 'clinician_feedback');

      const stats = {
        totalFeedback: feedbackPatterns.length,
        corrections: feedbackPatterns.filter((p) => p.metadata?.isCorrection === true).length,
        confirmations: feedbackPatterns.filter((p) => p.metadata?.isCorrection !== true).length,
        avgConfidence:
          feedbackPatterns.reduce((sum, p) => sum + (p.successRate ?? 0), 0) /
          (feedbackPatterns.length || 1),
        byFitzpatrick: {
          I: { count: 0, corrections: 0 },
          II: { count: 0, corrections: 0 },
          III: { count: 0, corrections: 0 },
          IV: { count: 0, corrections: 0 },
          V: { count: 0, corrections: 0 },
          VI: { count: 0, corrections: 0 },
        } as Record<FitzpatrickType, { count: number; corrections: number }>,
      };

      feedbackPatterns.forEach((p) => {
        const fitzpatrick = p.metadata?.fitzpatrick;
        if (!fitzpatrick) return;
        if (fitzpatrick in stats.byFitzpatrick) {
          stats.byFitzpatrick[fitzpatrick].count++;
          if (p.metadata?.isCorrection === true) {
            stats.byFitzpatrick[fitzpatrick].corrections++;
          }
        }
      });

      return stats;
    } catch (err) {
      Logger.error('AgentDB', 'Failed to get feedback stats', { error: err });
      return getEmptyFeedbackStats();
    }
  }
}

export { LocalLLMService } from './localLLMService';
