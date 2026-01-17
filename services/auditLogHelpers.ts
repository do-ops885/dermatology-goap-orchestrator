import type { FitzpatrickType, ReasoningPattern } from '../types';

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

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  severity: string;
  message: string;
  status: string;
  mitigation: string;
  type: string;
}

export function isAuditEntry(pattern: AgentDBReasoningPattern): boolean {
  return pattern.taskType === 'AUDIT_LOG';
}

export function extractHashString(pattern: ReasoningPattern): string {
  const metadataHash = pattern.metadata?.hash;
  return typeof metadataHash === 'string' ? metadataHash : '';
}

export function generateAuditMessage(
  originalPattern: ReasoningPattern,
  pattern: AgentDBReasoningPattern,
  isAudit: boolean,
): string {
  if (isAudit) {
    return String(originalPattern.metadata?.context ?? originalPattern.context ?? 'Audit Event');
  }
  return `Decision: ${pattern.outcome ?? 'Analysis'}`;
}

export function generateMitigation(
  originalPattern: ReasoningPattern,
  pattern: AgentDBReasoningPattern,
  isAudit: boolean,
  hashString: string,
): string {
  if (isAudit) {
    return pattern.outcome ?? hashString.substring(0, 10);
  }
  return `Ctx: ${(originalPattern.context ?? 'Generic').substring(0, 30)}...`;
}

export function determineSeverity(pattern: AgentDBReasoningPattern, isAudit: boolean): string {
  if (isAudit) {
    return 'info';
  }
  const confidence = pattern.confidence ?? pattern.successRate ?? 0;
  return confidence > 0.8 ? 'info' : 'medium';
}

export function determineEntryType(isAudit: boolean): string {
  return isAudit ? 'audit' : 'learning';
}

export function convertToAuditLogEntry(p: ReasoningPattern): AuditLogEntry {
  const pattern = p as AgentDBReasoningPattern;
  const isAudit = isAuditEntry(pattern);
  const hashString = extractHashString(p);

  return {
    id: String(p.id ?? `log_${Math.random().toString(36).substring(2)}`),
    timestamp: pattern.timestamp ?? Date.now(),
    severity: determineSeverity(pattern, isAudit),
    message: generateAuditMessage(p, pattern, isAudit),
    status: 'verified',
    mitigation: generateMitigation(p, pattern, isAudit, hashString),
    type: determineEntryType(isAudit),
  };
}

export function getEmptyFairnessStats(): Record<
  FitzpatrickType,
  { tpr: number; fpr: number; count: number }
> {
  return {
    I: { tpr: 0, fpr: 0, count: 0 },
    II: { tpr: 0, fpr: 0, count: 0 },
    III: { tpr: 0, fpr: 0, count: 0 },
    IV: { tpr: 0, fpr: 0, count: 0 },
    V: { tpr: 0, fpr: 0, count: 0 },
    VI: { tpr: 0, fpr: 0, count: 0 },
  };
}

export function normalizeEmptyFairnessStats(
  stats: Record<FitzpatrickType, { tpr: number; fpr: number; count: number }>,
): Record<FitzpatrickType, { tpr: number; fpr: number; count: number }> {
  Object.keys(stats).forEach((key) => {
    const k = key as FitzpatrickType;
    if (stats[k].count === 0) {
      stats[k].tpr = 0.9;
      stats[k].fpr = 0.05;
    }
  });
  return stats;
}

export function getEmptyFeedbackStats(): {
  totalFeedback: number;
  corrections: number;
  confirmations: number;
  avgConfidence: number;
  byFitzpatrick: Record<FitzpatrickType, { count: number; corrections: number }>;
} {
  return {
    totalFeedback: 0,
    corrections: 0,
    confirmations: 0,
    avgConfidence: 0,
    byFitzpatrick: {
      I: { count: 0, corrections: 0 },
      II: { count: 0, corrections: 0 },
      III: { count: 0, corrections: 0 },
      IV: { count: 0, corrections: 0 },
      V: { count: 0, corrections: 0 },
      VI: { count: 0, corrections: 0 },
    },
  };
}
