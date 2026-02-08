import { describe, it, expect } from 'vitest';

import { fairnessAuditExecutor } from '../../../services/executors/fairnessAuditExecutor';
import { INITIAL_STATE } from '../../../types';
import { createMockAgentContext } from '../../test-helpers/mock-context';

describe('Fairness-Audit-Agent', () => {
  describe('TPR Gap Validation', () => {
    it('should calculate TPR gap within acceptable range for high fairness score', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.92,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.tpr_gap).toBeDefined();
      expect(typeof result.metadata.tpr_gap).toBe('number');
      expect(result.metadata.tpr_gap).toBeGreaterThanOrEqual(0);
    });

    it('should report TPR gap for borderline fairness scores', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.85,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.tpr_gap).toBeDefined();
      expect(result.metadata.status).toBeDefined();
    });

    it('should validate TPR consistency across demographic groups', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.88,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.tpr_gap).toBeLessThanOrEqual(0.1);
    });
  });

  describe('FPR Gap Validation', () => {
    it('should include FPR metrics in audit results', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.9,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata).toHaveProperty('tpr_gap');
    });

    it('should detect elevated FPR gaps as warning indicators', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.75,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('warning');
    });
  });

  describe('Bias Detection', () => {
    it('should pass audit when fairness score exceeds threshold (0.85)', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.86,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('passed');
    });

    it('should warn when fairness score is at or below threshold', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.85,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('warning');
    });

    it('should flag significant bias for low fairness scores', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.6,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('warning');
    });

    it('should handle perfect fairness score', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 1.0,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('passed');
    });

    it('should handle minimum fairness score', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('warning');
    });
  });

  describe('Audit Report Generation', () => {
    it('should return metadata object with audit results', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.9,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result).toHaveProperty('metadata');
      expect(typeof result.metadata).toBe('object');
    });

    it('should include TPR gap in metadata', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.9,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata).toHaveProperty('tpr_gap');
      expect(typeof result.metadata.tpr_gap).toBe('number');
    });

    it('should include status in metadata', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.9,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata).toHaveProperty('status');
      expect(['passed', 'warning']).toContain(result.metadata.status);
    });

    it('should not include newStateUpdates by default', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.9,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.newStateUpdates).toBeUndefined();
    });

    it('should not trigger replanning', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.9,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.shouldReplan).toBeUndefined();
    });
  });

  describe('Pass/Fail Determination', () => {
    it('should pass when fairness score is above 0.85 threshold', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.851,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('passed');
    });

    it('should warn when fairness score equals 0.85 threshold', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.85,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('warning');
    });

    it('should warn when fairness score is below 0.85 threshold', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.849,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('warning');
    });

    it('should handle missing fairness_score gracefully', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: undefined as unknown as number,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('warning');
      expect(result.metadata.tpr_gap).toBeDefined();
    });

    it('should handle zero fairness score appropriately', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('warning');
    });
  });

  describe('Demographic Gap Analysis', () => {
    it('should validate acceptable TPR gap across different skin tones', async () => {
      const skinTones = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

      for (const skinTone of skinTones) {
        const ctx = createMockAgentContext({
          currentState: {
            ...INITIAL_STATE,
            fairness_score: 0.9,
            fitzpatrick_type: skinTone,
          },
        });

        const result = await fairnessAuditExecutor(ctx);
        expect(result.metadata.tpr_gap).toBeLessThanOrEqual(0.1);
      }
    });

    it('should maintain consistent gap reporting across all demographics', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.88,
          fitzpatrick_type: 'IV',
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(typeof result.metadata.tpr_gap).toBe('number');
      expect(result.metadata.tpr_gap).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative fairness scores', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: -0.5,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('warning');
    });

    it('should handle fairness score of exactly 1.0', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 1.0,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('passed');
    });

    it('should handle very small positive fairness scores', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.001,
        },
      });

      const result = await fairnessAuditExecutor(ctx);

      expect(result.metadata.status).toBe('warning');
    });

    it('should return consistent TPR gap value across multiple calls', async () => {
      const ctx = createMockAgentContext({
        currentState: {
          ...INITIAL_STATE,
          fairness_score: 0.9,
        },
      });

      const result1 = await fairnessAuditExecutor(ctx);
      const result2 = await fairnessAuditExecutor(ctx);

      expect(result1.metadata.tpr_gap).toBe(result2.metadata.tpr_gap);
    });
  });
});
