/**
 * Agent Executor Registry
 * Maps agent IDs to their executor functions for runtime lookup
 */

import type { ExecutorMap } from './agent';

import {
  imageVerificationExecutor,
  skinToneDetectionExecutor,
  calibrationExecutor,
  preprocessingExecutor,
  segmentationExecutor,
  featureExtractionExecutor,
  lesionDetectionExecutor,
  similaritySearchExecutor,
  riskAssessmentExecutor,
  fairnessAuditExecutor,
  webVerificationExecutor,
  recommendationExecutor,
  learningExecutor,
  privacyEncryptionExecutor,
  auditTrailExecutor
} from '../executors';

/**
 * Runtime registry of all clinical pipeline agents
 * Maps AgentID (from AVAILABLE_ACTIONS) to executor function
 */
export const EXECUTOR_REGISTRY: ExecutorMap = {
  'Image-Verification-Agent': imageVerificationExecutor,
  'Skin-Tone-Detection-Agent': skinToneDetectionExecutor,
  'Standard-Calibration-Agent': calibrationExecutor,
  'Safety-Calibration-Agent': calibrationExecutor, // Same executor, different thresholds
  'Image-Preprocessing-Agent': preprocessingExecutor,
  'Segmentation-Agent': segmentationExecutor,
  'Feature-Extraction-Agent': featureExtractionExecutor,
  'Lesion-Detection-Agent': lesionDetectionExecutor,
  'Similarity-Search-Agent': similaritySearchExecutor,
  'Risk-Assessment-Agent': riskAssessmentExecutor,
  'Fairness-Audit-Agent': fairnessAuditExecutor,
  'Web-Verification-Agent': webVerificationExecutor,
  'Recommendation-Agent': recommendationExecutor,
  'Learning-Agent': learningExecutor,
  'Privacy-Encryption-Agent': privacyEncryptionExecutor,
  'Audit-Trail-Agent': auditTrailExecutor
};

/**
 * Create a GoapAgent instance with the standard executor registry
 */
import { GOAPPlanner } from '../goap';

import { GoapAgent } from './agent';

export function createGoapAgent(opts?: { perAgentTimeoutMs?: number }): GoapAgent {
  const planner = new GOAPPlanner();
  return new GoapAgent(planner, EXECUTOR_REGISTRY, opts);
}
