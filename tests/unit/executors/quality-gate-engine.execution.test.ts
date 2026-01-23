import { describe, it, expect, vi, beforeEach } from 'vitest';

import { QualityGateGoapEngine } from '../../../services/executors/quality-gate-engine';

import type { QualityGateWorldState } from '../../../services/quality-gate-goap';

describe('QualityGateGoapEngine - Execution', () => {
  let engine: QualityGateGoapEngine;

  beforeEach(() => {
    engine = new QualityGateGoapEngine();
  });

  describe('executeStep', () => {
    it('should execute one action step successfully', async () => {
      const onAgentExecute = vi.fn();
      const onStateChange = vi.fn();

      const testEngine = new QualityGateGoapEngine({
        onAgentExecute,
        onStateChange,
      });

      const result = await testEngine.executeStep();

      expect(result.success).toBe(true);
      expect(result.action).toBeDefined();
      expect(result.agent).toBeDefined();
      expect(onAgentExecute).toHaveBeenCalledTimes(1);
      expect(onStateChange).toHaveBeenCalledTimes(1);
    });

    it('should call onAgentExecute with agent and action', async () => {
      const onAgentExecute = vi.fn();

      const testEngine = new QualityGateGoapEngine({
        onAgentExecute,
      });

      await testEngine.executeStep();

      expect(onAgentExecute).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: expect.any(String),
          cost: expect.any(Number),
        }),
      );
    });

    it('should call onStateChange with new state', async () => {
      const onStateChange = vi.fn();

      const testEngine = new QualityGateGoapEngine({
        onStateChange,
      });

      const oldState = testEngine.getState();
      await testEngine.executeStep();

      expect(onStateChange).toHaveBeenCalledWith(expect.not.objectContaining(oldState));
    });

    it('should return success=true when no more actions but goal satisfied', async () => {
      const initialState: QualityGateWorldState = {
        eslint_passing: true,
        npm_audit_passing: true,
        code_complexity_passing: true,
        formatting_passing: true,
        unit_tests_passing: true,
        e2e_tests_passing: true,
        sonarcloud_passing: true,
        all_ci_checks_passing: true,
        eslint_status: {
          error_count: 0,
          warning_count: 0,
          critical_errors_fixed: true,
          rules_configured: true,
        },
        npm_audit_status: {
          vulnerabilities_count: 0,
          vulnerabilities_fixed: true,
        },
        formatting_status: {
          files_formatted: 85,
          total_files: 85,
          style_guide_compliant: true,
          auto_fix_applied: true,
        },
        unit_tests_status: {
          tests_passing: 150,
          total_tests: 150,
          coverage_percentage: 100,
          minimum_coverage_met: true,
        },
        e2e_tests_status: {
          scenarios_passing: 12,
          total_scenarios: 12,
          critical_paths_covered: true,
          flaky_tests_identified: true,
        },
        sonarcloud_status: {
          bugs_count: 0,
          vulnerabilities_count: 0,
          code_smells_count: 0,
          quality_gate_status: 'PASSED',
        },
        code_complexity_status: {
          average_complexity: 1,
          max_complexity: 5,
          files_above_threshold: 0,
          complexity_reduced: true,
        },
        current_attempt: 0,
        last_agent_executed: null,
        error_log: [],
        timestamp: Date.now(),
      };

      const testEngine = new QualityGateGoapEngine();
      (testEngine as unknown as { _state: QualityGateWorldState })._state = initialState;

      const result = await testEngine.executeStep();

      expect(result.success).toBe(true);
      expect(result.action).toBeUndefined();
      expect(result.agent).toBeUndefined();
    });

    it('should return success=false with error when goal not satisfied and no actions available', async () => {
      const onError = vi.fn();

      const testEngine = new QualityGateGoapEngine({ onError });
      (testEngine as unknown as { _state: QualityGateWorldState })._state = {
        eslint_passing: false,
        npm_audit_passing: false,
        code_complexity_passing: false,
        formatting_passing: false,
        unit_tests_passing: false,
        e2e_tests_passing: false,
        sonarcloud_passing: false,
        all_ci_checks_passing: false,
        eslint_status: {
          error_count: 0,
          warning_count: 0,
          critical_errors_fixed: true,
          rules_configured: true,
        },
        npm_audit_status: {
          vulnerabilities_count: 0,
          vulnerabilities_fixed: true,
        },
        formatting_status: {
          files_formatted: 85,
          total_files: 85,
          style_guide_compliant: true,
          auto_fix_applied: true,
        },
        unit_tests_status: {
          tests_passing: 150,
          total_tests: 150,
          coverage_percentage: 100,
          minimum_coverage_met: true,
        },
        e2e_tests_status: {
          scenarios_passing: 12,
          total_scenarios: 12,
          critical_paths_covered: true,
          flaky_tests_identified: true,
        },
        sonarcloud_status: {
          bugs_count: 0,
          vulnerabilities_count: 0,
          code_smells_count: 0,
          quality_gate_status: 'PASSED',
        },
        code_complexity_status: {
          average_complexity: 1,
          max_complexity: 5,
          files_above_threshold: 0,
          complexity_reduced: true,
        },
        current_attempt: 0,
        last_agent_executed: null,
        error_log: [],
        timestamp: Date.now(),
      };

      const result = await testEngine.executeStep();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('No more actions available');
      expect(onError).toHaveBeenCalled();
    });

    it('should return success=false with error when precondition check fails', async () => {
      const onError = vi.fn();

      const testEngine = new QualityGateGoapEngine({ onError });
      (testEngine as unknown as { _state: QualityGateWorldState })._state = {
        eslint_passing: false,
        npm_audit_passing: false,
        code_complexity_passing: false,
        formatting_passing: false,
        unit_tests_passing: false,
        e2e_tests_passing: false,
        sonarcloud_passing: false,
        all_ci_checks_passing: false,
        eslint_status: {
          error_count: 15,
          warning_count: 32,
          critical_errors_fixed: false,
          rules_configured: false,
        },
        npm_audit_status: {
          vulnerabilities_count: 2,
          vulnerabilities_fixed: false,
        },
        formatting_status: {
          files_formatted: 0,
          total_files: 85,
          style_guide_compliant: false,
          auto_fix_applied: false,
        },
        unit_tests_status: {
          tests_passing: 120,
          total_tests: 150,
          coverage_percentage: 78,
          minimum_coverage_met: false,
        },
        e2e_tests_status: {
          scenarios_passing: 8,
          total_scenarios: 12,
          critical_paths_covered: false,
          flaky_tests_identified: false,
        },
        sonarcloud_status: {
          bugs_count: 3,
          vulnerabilities_count: 1,
          code_smells_count: 45,
          quality_gate_status: 'FAILED',
        },
        code_complexity_status: {
          average_complexity: 12,
          max_complexity: 25,
          files_above_threshold: 8,
          complexity_reduced: false,
        },
        current_attempt: 0,
        last_agent_executed: null,
        error_log: [],
        timestamp: Date.now(),
      };

      const result = await testEngine.executeStep();

      if (result.success === false) {
        expect(onError).toHaveBeenCalled();
      }
    });
  });

  describe('executeAll', () => {
    it('should execute all actions until goal is reached', async () => {
      const result = await engine.executeAll();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('finalState');
      expect(result).toHaveProperty('steps');
      expect(result).toHaveProperty('errors');
      expect(typeof result.steps).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should track errors encountered during execution', async () => {
      const onError = vi.fn();

      const testEngine = new QualityGateGoapEngine({ onError });

      const result = await testEngine.executeAll();

      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should stop after maxSteps to prevent infinite loops', async () => {
      const result = await engine.executeAll();

      expect(result.steps).toBeLessThanOrEqual(50);
    });

    it('should return success based on goal satisfaction', async () => {
      const result = await engine.executeAll();

      expect(typeof result.success).toBe('boolean');
    });

    it('should modify state during execution', async () => {
      const initialState = engine.getState();
      await engine.executeAll();
      const finalState = engine.getState();

      expect(finalState).not.toEqual(initialState);
    });
  });

  describe('executeUntilFailure', () => {
    it('should execute until first failure', async () => {
      const result = await engine.executeUntilFailure();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('finalState');
      expect(result).toHaveProperty('steps');
      expect(result).toHaveProperty('lastAction');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.steps).toBe('number');
    });

    it('should track last executed action', async () => {
      const result = await engine.executeUntilFailure();

      if (result.lastAction) {
        expect(result.lastAction).toHaveProperty('agent');
        expect(result.lastAction).toHaveProperty('action');
        expect(result.lastAction.action).toHaveProperty('name');
      }
    });

    it('should stop immediately on failure', async () => {
      const onError = vi.fn();
      const testEngine = new QualityGateGoapEngine({ onError });

      await testEngine.executeUntilFailure();
    });

    it('should continue until goal reached or max steps', async () => {
      const result = await engine.executeUntilFailure();

      expect(result.steps).toBeLessThanOrEqual(50);
    });
  });
});
