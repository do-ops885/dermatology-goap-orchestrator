import { describe, it, expect, vi, beforeEach } from 'vitest';

import { QualityGateGoapEngine } from '../../../services/executors/quality-gate-engine';

import type { QualityGateWorldState } from '../../../services/quality-gate-goap';

describe('QualityGateGoapEngine - Core', () => {
  let engine: QualityGateGoapEngine;

  beforeEach(() => {
    engine = new QualityGateGoapEngine();
  });

  describe('constructor', () => {
    it('should initialize with default state', () => {
      const state = engine.getState();
      expect(state.eslint_passing).toBe(false);
      expect(state.formatting_passing).toBe(false);
      expect(state.unit_tests_passing).toBe(false);
    });

    it('should accept callbacks', () => {
      const onStateChange = vi.fn();
      const onAgentExecute = vi.fn();
      const onError = vi.fn();

      const testEngine = new QualityGateGoapEngine({
        onStateChange,
        onAgentExecute,
        onError,
      });

      const state = testEngine.getState();
      expect(state.eslint_passing).toBe(false);
    });
  });

  describe('getState', () => {
    it('should return a copy of state (not reference)', () => {
      const state1 = engine.getState();
      const state2 = engine.getState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });

    it('should not be affected by state mutations', () => {
      const state1 = engine.getState() as QualityGateWorldState & Record<string, unknown>;
      state1.eslint_passing = true;

      const state2 = engine.getState();
      expect(state2.eslint_passing).toBe(false);
    });
  });
});
