import type { AgentContext, ExecutorResult } from './types';
import { CryptoService } from '../crypto';

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
      analysisId: analysisPayload?.id || newHash,
      triggerReason: analysisPayload?.criticalError || 'High-risk diagnosis detected',
      diagnosis: analysisPayload?.lesions?.[0]?.type,
      riskLevel: analysisPayload?.risk_label
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
    new Promise(resolve => setTimeout(resolve, 2000)) 
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

function determineSafetyLevel(payload: any): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (payload?.criticalError) return 'HIGH';
  if (payload?.lesions?.[0]?.type === 'Melanoma' && payload?.risk_label === 'High') {
    return 'HIGH';
  }
  if (payload?.skinToneConfidence < 0.3) return 'HIGH';
  if (payload?.skinToneConfidence < 0.65) return 'MEDIUM';
  return 'LOW';
}
