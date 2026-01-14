import { describe, it, expect } from 'vitest';

import { GOAPPlanner } from '../../services/goap';
import { GoapAgent } from '../../services/goap/agent';
import { INITIAL_STATE, type WorldState } from '../../types';

import type { ExecutorFn } from '../../services/goap/agent';

/**
 * Integration tests for GOAP Agent failure handling
 * Tests that the orchestrator properly handles agent failures and routes to safety mechanisms
 */

describe('GoapAgent Failure Handling', () => {
  const noopExecutor: ExecutorFn = async () => Promise.resolve({ metadata: { ok: true } });

  describe('Non-Critical Agent Failures', () => {
    it('should skip non-critical agents that fail and continue execution', async () => {
      const planner = new GOAPPlanner();

      // Simulate a non-critical agent failure (e.g., Web-Verification-Agent)
      const failingExecutor: ExecutorFn = async () => {
        throw new Error('Network timeout - unable to verify guidelines');
      };

      const executors: Record<string, ExecutorFn> = {
        'Image-Verification-Agent': noopExecutor,
        'Skin-Tone-Detection-Agent': noopExecutor,
        'Standard-Calibration-Agent': noopExecutor,
        'Image-Preprocessing-Agent': noopExecutor,
        'Segmentation-Agent': noopExecutor,
        'Feature-Extraction-Agent': noopExecutor,
        'Lesion-Detection-Agent': noopExecutor,
        'Similarity-Search-Agent': noopExecutor,
        'Risk-Assessment-Agent': noopExecutor,
        'Fairness-Audit-Agent': noopExecutor,
        'Web-Verification-Agent': failingExecutor, // Non-critical - should skip
        'Recommendation-Agent': noopExecutor,
        'Learning-Agent': noopExecutor,
        'Privacy-Encryption-Agent': noopExecutor,
        'Audit-Trail-Agent': noopExecutor,
      };

      const agent = new GoapAgent(planner, executors);
      const trace = await agent.execute(INITIAL_STATE, { audit_logged: true }, {});

      // Verify the failing agent was skipped
      const webVerificationAgent = trace.agents.find((a) => a.agentId === 'Web-Verification-Agent');
      expect(webVerificationAgent).toBeDefined();
      expect(webVerificationAgent?.status).toBe('skipped');

      // Verify execution continued and completed
      expect(trace.finalWorldState.audit_logged).toBe(true);
      expect(trace.agents.filter((a) => a.status === 'completed').length).toBeGreaterThan(0);
    });

    it('should log failure reasons for skipped agents', async () => {
      const planner = new GOAPPlanner();

      const failingExecutor: ExecutorFn = async () => {
        throw new Error('Similarity search index unavailable');
      };

      const executors: Record<string, ExecutorFn> = {
        'Image-Verification-Agent': noopExecutor,
        'Skin-Tone-Detection-Agent': noopExecutor,
        'Standard-Calibration-Agent': noopExecutor,
        'Image-Preprocessing-Agent': noopExecutor,
        'Segmentation-Agent': noopExecutor,
        'Feature-Extraction-Agent': noopExecutor,
        'Lesion-Detection-Agent': noopExecutor,
        'Similarity-Search-Agent': failingExecutor,
        'Risk-Assessment-Agent': noopExecutor,
        'Fairness-Audit-Agent': noopExecutor,
        'Web-Verification-Agent': noopExecutor,
        'Recommendation-Agent': noopExecutor,
        'Learning-Agent': noopExecutor,
        'Privacy-Encryption-Agent': noopExecutor,
        'Audit-Trail-Agent': noopExecutor,
      };

      const agent = new GoapAgent(planner, executors);
      const trace = await agent.execute(INITIAL_STATE, { audit_logged: true }, {});

      const similarityAgent = trace.agents.find((a) => a.agentId === 'Similarity-Search-Agent');
      expect(similarityAgent?.status).toBe('skipped');
      expect(similarityAgent?.error).toBeDefined();
      expect(similarityAgent?.error).toContain('Similarity search index unavailable');
    });
  });

  describe('Low Confidence Safety Routing', () => {
    it('should route to Safety-Calibration-Agent when low confidence is detected', async () => {
      const planner = new GOAPPlanner();

      // Start with a state that already has low confidence flag set
      const lowConfidenceState: WorldState = {
        ...INITIAL_STATE,
        image_verified: true,
        skin_tone_detected: true,
        is_low_confidence: true,
      };

      const executors: Record<string, ExecutorFn> = {
        'Safety-Calibration-Agent': noopExecutor,
        'Standard-Calibration-Agent': noopExecutor,
        'Image-Preprocessing-Agent': noopExecutor,
        'Segmentation-Agent': noopExecutor,
        'Feature-Extraction-Agent': noopExecutor,
        'Lesion-Detection-Agent': noopExecutor,
        'Similarity-Search-Agent': noopExecutor,
        'Risk-Assessment-Agent': noopExecutor,
        'Fairness-Audit-Agent': noopExecutor,
        'Web-Verification-Agent': noopExecutor,
        'Recommendation-Agent': noopExecutor,
        'Learning-Agent': noopExecutor,
        'Privacy-Encryption-Agent': noopExecutor,
        'Audit-Trail-Agent': noopExecutor,
      };

      const agent = new GoapAgent(planner, executors);
      const trace = await agent.execute(lowConfidenceState, { audit_logged: true }, {});

      // Verify Safety-Calibration-Agent was used (planner should prefer it when is_low_confidence is true)
      const safetyCalibration = trace.agents.find((a) => a.agentId === 'Safety-Calibration-Agent');

      expect(safetyCalibration).toBeDefined();
      expect(safetyCalibration?.status).toBe('completed');

      // Verify world state reflects low confidence routing
      expect(trace.finalWorldState.is_low_confidence).toBe(true);
    });

    it('should apply conservative thresholds with Safety-Calibration-Agent', async () => {
      const planner = new GOAPPlanner();

      let thresholdApplied = 0;

      const safetyCalibrator: ExecutorFn = async () => {
        thresholdApplied = 0.5; // Conservative threshold
        return Promise.resolve({
          metadata: { threshold: 0.5, mode: 'conservative' },
        });
      };

      // Start with low confidence state already set
      const lowConfidenceState: WorldState = {
        ...INITIAL_STATE,
        image_verified: true,
        skin_tone_detected: true,
        is_low_confidence: true,
      };

      const executors: Record<string, ExecutorFn> = {
        'Safety-Calibration-Agent': safetyCalibrator,
        'Image-Preprocessing-Agent': noopExecutor,
        'Segmentation-Agent': noopExecutor,
        'Feature-Extraction-Agent': noopExecutor,
        'Lesion-Detection-Agent': noopExecutor,
        'Similarity-Search-Agent': noopExecutor,
        'Risk-Assessment-Agent': noopExecutor,
        'Fairness-Audit-Agent': noopExecutor,
        'Web-Verification-Agent': noopExecutor,
        'Recommendation-Agent': noopExecutor,
        'Learning-Agent': noopExecutor,
        'Privacy-Encryption-Agent': noopExecutor,
        'Audit-Trail-Agent': noopExecutor,
      };

      const agent = new GoapAgent(planner, executors);
      await agent.execute(lowConfidenceState, { audit_logged: true }, {});

      expect(thresholdApplied).toBe(0.5);
    });
  });

  describe('Critical Agent Failures', () => {
    it('should abort execution on critical agent failure', async () => {
      const planner = new GOAPPlanner();

      // Image verification is critical - failure should abort
      const criticalFailureExecutor: ExecutorFn = async () => {
        throw new Error('Critical: Invalid image format');
      };

      const executors: Record<string, ExecutorFn> = {
        'Image-Verification-Agent': criticalFailureExecutor,
      };

      const agent = new GoapAgent(planner, executors);

      await expect(agent.execute(INITIAL_STATE, { audit_logged: true }, {})).rejects.toThrow(
        'Critical',
      );
    });

    it('should abort on encryption failure', async () => {
      const planner = new GOAPPlanner();

      const encryptionFailureExecutor: ExecutorFn = async () => {
        throw new Error('Critical: Encryption key generation failed');
      };

      const executors: Record<string, ExecutorFn> = {
        'Image-Verification-Agent': noopExecutor,
        'Skin-Tone-Detection-Agent': noopExecutor,
        'Standard-Calibration-Agent': noopExecutor,
        'Image-Preprocessing-Agent': noopExecutor,
        'Segmentation-Agent': noopExecutor,
        'Feature-Extraction-Agent': noopExecutor,
        'Lesion-Detection-Agent': noopExecutor,
        'Similarity-Search-Agent': noopExecutor,
        'Risk-Assessment-Agent': noopExecutor,
        'Fairness-Audit-Agent': noopExecutor,
        'Web-Verification-Agent': noopExecutor,
        'Recommendation-Agent': noopExecutor,
        'Learning-Agent': noopExecutor,
        'Privacy-Encryption-Agent': encryptionFailureExecutor,
        'Audit-Trail-Agent': noopExecutor,
      };

      const agent = new GoapAgent(planner, executors);

      await expect(agent.execute(INITIAL_STATE, { audit_logged: true }, {})).rejects.toThrow(
        'Critical',
      );
    });
  });

  describe('Replanning on State Changes', () => {
    it('should replan when agent signals shouldReplan', async () => {
      const planner = new GOAPPlanner();

      let replanTriggered = false;

      const replanningExecutor: ExecutorFn = async () => {
        if (!replanTriggered) {
          replanTriggered = true;
          return Promise.resolve({
            shouldReplan: true,
            newStateUpdates: { is_low_confidence: true },
          });
        }
        return Promise.resolve({ metadata: { ok: true } });
      };

      const executors: Record<string, ExecutorFn> = {
        'Image-Verification-Agent': noopExecutor,
        'Skin-Tone-Detection-Agent': replanningExecutor,
        'Safety-Calibration-Agent': noopExecutor,
        'Standard-Calibration-Agent': noopExecutor,
        'Image-Preprocessing-Agent': noopExecutor,
        'Segmentation-Agent': noopExecutor,
        'Feature-Extraction-Agent': noopExecutor,
        'Lesion-Detection-Agent': noopExecutor,
        'Similarity-Search-Agent': noopExecutor,
        'Risk-Assessment-Agent': noopExecutor,
        'Fairness-Audit-Agent': noopExecutor,
        'Web-Verification-Agent': noopExecutor,
        'Recommendation-Agent': noopExecutor,
        'Learning-Agent': noopExecutor,
        'Privacy-Encryption-Agent': noopExecutor,
        'Audit-Trail-Agent': noopExecutor,
      };

      const agent = new GoapAgent(planner, executors);
      const trace = await agent.execute(INITIAL_STATE, { audit_logged: true }, {});

      expect(replanTriggered).toBe(true);
      expect(trace.finalWorldState.is_low_confidence).toBe(true);

      // Should have Safety-Calibration-Agent in the trace after replan
      const safetyCalibration = trace.agents.find((a) => a.agentId === 'Safety-Calibration-Agent');
      expect(safetyCalibration).toBeDefined();
    });

    it('should maintain state consistency across replanning', async () => {
      const planner = new GOAPPlanner();

      const stateTrackingExecutor: ExecutorFn = async (_state: WorldState) => {
        return Promise.resolve({
          shouldReplan: false,
          newStateUpdates: { verification_timestamp: Date.now() },
        });
      };

      const executors: Record<string, ExecutorFn> = {
        'Image-Verification-Agent': stateTrackingExecutor,
        'Skin-Tone-Detection-Agent': noopExecutor,
        'Standard-Calibration-Agent': noopExecutor,
        'Image-Preprocessing-Agent': noopExecutor,
        'Segmentation-Agent': noopExecutor,
        'Feature-Extraction-Agent': noopExecutor,
        'Lesion-Detection-Agent': noopExecutor,
        'Similarity-Search-Agent': noopExecutor,
        'Risk-Assessment-Agent': noopExecutor,
        'Fairness-Audit-Agent': noopExecutor,
        'Web-Verification-Agent': noopExecutor,
        'Recommendation-Agent': noopExecutor,
        'Learning-Agent': noopExecutor,
        'Privacy-Encryption-Agent': noopExecutor,
        'Audit-Trail-Agent': noopExecutor,
      };

      const agent = new GoapAgent(planner, executors);
      const trace = await agent.execute(INITIAL_STATE, { audit_logged: true }, {});

      // Verify custom state updates are preserved
      expect(trace.finalWorldState.verification_timestamp).toBeDefined();
      expect(typeof trace.finalWorldState.verification_timestamp).toBe('number');
    });
  });
});
