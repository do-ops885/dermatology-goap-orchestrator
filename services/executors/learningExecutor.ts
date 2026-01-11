import type { AgentContext, ExecutorResult } from './types';
import { FitzpatrickType } from '../../types';
import { Logger } from '../logger';

/**
 * Learning-Agent Executor
 * Stores diagnosis patterns and clinician feedback in the vector database
 * for continuous model improvement through human-in-the-loop learning.
 */

export const learningExecutor = async ({ reasoningBank, currentState, analysisPayload }: AgentContext): Promise<ExecutorResult> => {
  try {
    // Store the AI diagnosis pattern for similarity search and fairness tracking
    if (analysisPayload?.lesions && analysisPayload.lesions.length > 0) {
      const primaryLesion = analysisPayload.lesions[0];
      
      await reasoningBank.storePattern({
        taskType: 'diagnosis',
        approach: `Fairness Score ${currentState.fairness_score.toFixed(2)}`,
        outcome: analysisPayload.risk_label || primaryLesion.type,
        successRate: analysisPayload.confidence || primaryLesion.confidence || 0.9,
        timestamp: Date.now(),
        metadata: {
          fitzpatrick: (currentState.fitzpatrick_type as FitzpatrickType) || 'I',
          risk: analysisPayload.risk_label || primaryLesion.risk,
          lesion_type: primaryLesion.type,
          verified: false, // Will be verified by clinician feedback
          confidence_score: currentState.confidence_score,
          fairness_score: currentState.fairness_score,
          safety_calibrated: currentState.safety_calibrated,
          context: `Fitzpatrick ${currentState.fitzpatrick_type}, ${primaryLesion.type}, Risk: ${primaryLesion.risk}`,
          analysis_timestamp: Date.now()
        }
      } as any);

      Logger.info('Learning-Agent', 'Diagnosis pattern stored', {
        lesion: primaryLesion.type,
        fitzpatrick: currentState.fitzpatrick_type,
        fairness: currentState.fairness_score
      });
    }

    // Check for pending clinician feedback and integrate it
    if (analysisPayload?.clinicianFeedback) {
      const feedback = analysisPayload.clinicianFeedback;
      
      await reasoningBank.storePattern({
        taskType: 'clinician_feedback',
        approach: feedback.isCorrection ? 'correction' : 'confirmation',
        outcome: feedback.correctedDiagnosis || feedback.diagnosis,
        successRate: feedback.confidence,
        timestamp: feedback.timestamp,
        metadata: {
          feedbackId: feedback.id,
          analysisId: feedback.analysisId,
          originalDiagnosis: feedback.diagnosis,
          correctedDiagnosis: feedback.correctedDiagnosis,
          fitzpatrick: feedback.fitzpatrickType || (currentState.fitzpatrick_type as FitzpatrickType) || 'I',
          clinicianId: feedback.clinicianId,
          notes: feedback.notes,
          isCorrection: feedback.isCorrection,
          verified: true, // Human-verified data is gold standard
          feedback_source: 'clinician',
          learning_weight: feedback.isCorrection ? 2.0 : 1.0 // Corrections have higher learning weight
        }
      } as any);

      Logger.info('Learning-Agent', 'Clinician feedback integrated', {
        feedbackId: feedback.id,
        isCorrection: feedback.isCorrection,
        fitzpatrick: feedback.fitzpatrickType
      });
    }

    // Simulate learning/indexing delay
    await new Promise(r => setTimeout(r, 200));

    return { 
      metadata: { 
        memory_updated: 'pattern_committed',
        patterns_stored: analysisPayload?.lesions ? 1 : 0,
        feedback_integrated: !!analysisPayload?.clinicianFeedback
      } 
    };
  } catch (error) {
    Logger.error('Learning-Agent', 'Failed to store patterns', { error });
    return {
      metadata: {
        memory_updated: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};
