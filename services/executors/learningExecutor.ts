import type { AgentContext, ExecutorResult } from './types';
import { FitzpatrickType } from '../../types';

export const storeClinicianFeedback = async (
  reasoningBank: unknown,
  feedback: {
    diagnosis: string;
    correctedDiagnosis?: string;
    confidence: number;
    notes: string;
    timestamp: number;
    fitzpatrickType?: FitzpatrickType;
  }
): Promise<void> => {
  await reasoningBank.storePattern({
    taskType: 'clinician_feedback',
    approach: 'human_correction',
    outcome: feedback.correctedDiagnosis || feedback.diagnosis,
    successRate: feedback.confidence,
    metadata: {
      originalDiagnosis: feedback.diagnosis,
      fitzpatrick: feedback.fitzpatrickType || 'I',
      notes: feedback.notes,
      feedback_timestamp: feedback.timestamp,
      verified: false
    }
  } as any);
};

export const learningExecutor = async ({ reasoningBank, currentState, analysisPayload }: AgentContext): Promise<ExecutorResult> => {
  if (analysisPayload?.lesions) {
    await reasoningBank.storePattern({
      taskType: 'diagnosis',
      approach: `Fairness Score ${currentState.fairness_score.toFixed(2)}`,
      outcome: analysisPayload.risk_label,
      successRate: analysisPayload.confidence || 0.9,
      metadata: {
        fitzpatrick: (currentState.fitzpatrick_type as FitzpatrickType) || 'I',
        risk: analysisPayload.risk_label,
        verified: true,
        context: `Fitzpatrick ${currentState.fitzpatrick_type}, ${analysisPayload.lesions[0].type}`
      }
    } as any);
  }
  await new Promise(r => setTimeout(r, 200));
  return { metadata: { memory_updated: 'pattern_committed' } };
};
