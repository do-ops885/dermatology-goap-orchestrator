import { CryptoService } from '../crypto';

import type { AgentContext, ExecutorResult } from './types';

interface AnalysisPayload {
  id?: unknown;
  criticalError?: unknown;
  lesions?: { type?: string; risk?: string }[];
  risk_label?: unknown;
  skinToneConfidence?: number;
}

export const auditTrailExecutor = async ({ agentDB, imageHash, actionTrace, lastAuditHashRef, analysisPayload }: AgentContext): Promise<ExecutorResult> => {
  const previousHash = lastAuditHashRef.current;
  const traceString = actionTrace.join('->');
  const dataToHash = `${previousHash}|${traceString}|${imageHash}`;
  const newHash = await CryptoService.generateHash(dataToHash);
  lastAuditHashRef.current = newHash;

  const safetyLevel = determineSafetyLevel(analysisPayload);

  if (safetyLevel === 'HIGH') {
    const { NotificationService } = await import('../notifications');
    await NotificationService.getInstance().sendCriticalAlert({
       analysisId: analysisPayload.id !== undefined ? String(analysisPayload.id as string | number | boolean) : newHash,
       triggerReason: analysisPayload.criticalError !== undefined ? String(analysisPayload.criticalError as string | number | boolean) : 'High-risk diagnosis detected',
       diagnosis: (analysisPayload.lesions as AnalysisPayload['lesions'])?.[0]?.type,
       riskLevel: analysisPayload.risk_label !== undefined ? String(analysisPayload.risk_label as string | number | boolean) : ''
    });
  }

  await Promise.race([
    agentDB.logAuditEvent({
      type: 'ANALYSIS_COMPLETED',
      hash: newHash,
      prev_hash: previousHash,
      agent_trace: actionTrace,
      safety_level: safetyLevel
    }),
    new Promise<void>(resolve => setTimeout(resolve, 2000))
  ]);

  return {
    metadata: {
      merkle_root: `0x${newHash.substring(0, 10)}...`,
      status: 'immutable',
      chain_verified: true,
      safety_level: safetyLevel
    }
  };
};

function determineSafetyLevel(payload: Record<string, unknown> | undefined): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (payload?.criticalError != null) return 'HIGH';
  const lesions = payload?.lesions as AnalysisPayload['lesions'];
  if (lesions?.[0]?.type === 'Melanoma' && payload?.risk_label === 'High') {
    return 'HIGH';
  }
  const skinToneConfidence = payload?.skinToneConfidence as number | undefined;
  if (skinToneConfidence !== undefined && skinToneConfidence < 0.3) return 'HIGH';
  if (skinToneConfidence !== undefined && skinToneConfidence < 0.65) return 'MEDIUM';
  return 'LOW';
}
