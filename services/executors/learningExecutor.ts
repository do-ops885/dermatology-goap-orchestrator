import { Logger } from '../logger';

import type { AgentContext, ExecutorResult } from './types';
import type { ReasoningPattern, ReasoningPatternMetadata, FitzpatrickType } from '../../types';

/**
 * Learning-Agent Executor
 * Stores diagnosis patterns and clinician feedback in vector database
 * for continuous model improvement through human-in-the-loop learning.
 */

interface Lesion {
  type: string;
  confidence: number;
  risk: string;
}

interface ClinicianFeedback {
  id: string;
  analysisId: string;
  diagnosis: string;
  correctedDiagnosis?: string;
  confidence: number;
  notes: string;
  timestamp: number;
  fitzpatrickType?: FitzpatrickType;
  clinicianId?: string;
  isCorrection: boolean;
}

export const learningExecutor = async ({
  reasoningBank,
  currentState,
  analysisPayload,
}: AgentContext): Promise<ExecutorResult> => {
  try {
    // Store the AI diagnosis pattern for similarity search and fairness tracking
    const lesions = analysisPayload.lesions as Lesion[] | undefined;
    if (lesions && lesions.length > 0) {
      const primaryLesion = lesions[0];
      if (primaryLesion) {
        const fitzpatrick = currentState.fitzpatrick_type || 'I';

        const metadata: ReasoningPatternMetadata = {
          fitzpatrick,
          risk: (analysisPayload.risk_label ?? primaryLesion.risk) as string,
          lesion_type: primaryLesion.type,
          verified: false, // Will be verified by clinician feedback
          confidence_score: currentState.confidence_score,
          fairness_score: currentState.fairness_score,
          safety_calibrated: currentState.safety_calibrated,
          context: `Fitzpatrick ${fitzpatrick}, ${primaryLesion.type}, Risk: ${primaryLesion.risk}`,
          analysis_timestamp: Date.now(),
        };

        const pattern: ReasoningPattern = {
          id: Date.now(),
          taskType: 'diagnosis',
          approach: `Fairness Score ${currentState.fairness_score.toFixed(2)}`,
          outcome: String(analysisPayload.risk_label ?? primaryLesion.type ?? 'unknown'),
          successRate: (analysisPayload.confidence as number) || primaryLesion.confidence || 0.9,
          timestamp: Date.now(),
          metadata,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await reasoningBank.storePattern(pattern as any);

        Logger.info('Learning-Agent', 'Diagnosis pattern stored', {
          lesion: primaryLesion.type,
          fitzpatrick,
          fairness: currentState.fairness_score,
        });
      }
    }

    // Check for pending clinician feedback and integrate it
    const feedback = analysisPayload.clinicianFeedback as ClinicianFeedback | undefined;
    if (feedback) {
      const fitzpatrick = feedback.fitzpatrickType || currentState.fitzpatrick_type || 'I';

      const metadata: ReasoningPatternMetadata = {
        feedbackId: feedback.id,
        analysisId: feedback.analysisId,
        originalDiagnosis: feedback.diagnosis,
        correctedDiagnosis: feedback.correctedDiagnosis,
        fitzpatrick,
        clinicianId: feedback.clinicianId,
        notes: feedback.notes,
        isCorrection: feedback.isCorrection,
        verified: true, // Human-verified data is gold standard
        feedback_source: 'clinician',
        learning_weight: feedback.isCorrection ? 2.0 : 1.0,
      };

      const pattern: ReasoningPattern = {
        id: Date.now(),
        taskType: 'clinician_feedback',
        approach: feedback.isCorrection ? 'correction' : 'confirmation',
        outcome: String(feedback.correctedDiagnosis ?? feedback.diagnosis),
        successRate: feedback.confidence,
        timestamp: feedback.timestamp,
        metadata,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await reasoningBank.storePattern(pattern as any);

      Logger.info('Learning-Agent', 'Clinician feedback integrated', {
        feedbackId: feedback.id,
        isCorrection: feedback.isCorrection,
        fitzpatrick: feedback.fitzpatrickType,
      });
    }

    // Simulate learning/indexing delay
    await new Promise<void>((r) => setTimeout(r, 200));

    return {
      metadata: {
        memory_updated: 'pattern_committed',
        patterns_stored: lesions ? 1 : 0,
        feedback_integrated: !!feedback,
      },
    };
  } catch (error) {
    Logger.error('Learning-Agent', 'Failed to store patterns', { error });
    return {
      metadata: {
        memory_updated: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
};
