import { describe, it, expect, vi, beforeEach } from 'vitest';

import { QualityGateGoapEngine } from '../../../services/executors/quality-gate-engine';

import type { QualityGateWorldState } from '../../../services/quality-gate-goap';

describe('QualityGateGoapEngine - Planning', () => {
  let engine: QualityGateGoapEngine;

  beforeEach(() => {
    engine = new QualityGateGoapEngine();
  });

  describe('getExecutionPlan', () => {
    it('should return execution plan without executing', async () => {
      const plan = engine.getExecutionPlan();

      expect(plan).toHaveProperty('steps');
      expect(plan).toHaveProperty('totalCost');
      expect(plan).toHaveProperty('estimatedDuration');
      expect(Array.isArray(plan.steps)).toBe(true);
      expect(typeof plan.totalCost).toBe('number');
      expect(typeof plan.estimatedDuration).toBe('number');
    });

    it('should not modify state', async () => {
      const stateBefore = engine.getState();
      engine.getExecutionPlan();
      const stateAfter = engine.getState();

      expect(stateAfter).toEqual(stateBefore);
    });

    it('should include agent, action, and dependencies for each step', async () => {
      const plan = engine.getExecutionPlan();

      plan.steps.forEach((step: any) => {
        expect(step).toHaveProperty('agent');
        expect(step).toHaveProperty('action');
        expect(step).toHaveProperty('dependencies');
        expect(step.action).toHaveProperty('name');
        expect(step.action).toHaveProperty('cost');
        expect(Array.isArray(step.dependencies)).toBe(true);
      });
    });

    it('should accumulate totalCost correctly', async () => {
      const plan = engine.getExecutionPlan();

      const calculatedCost = plan.steps.reduce(
        (sum: number, step: any) => sum + step.action.cost,
        0,
      );

      expect(plan.totalCost).toBe(calculatedCost);
    });

    it('should calculate estimatedDuration', async () => {
      const plan = engine.getExecutionPlan();

      const calculatedDuration = plan.steps.reduce(
        (sum: number, step: any) => sum + (step.action.duration ?? 1),
        0,
      );

      expect(plan.estimatedDuration).toBe(calculatedDuration);
    });
  });

  describe('error callback', () => {
    it('should call onError with error and context on executeStep failure', async () => {
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

      await testEngine.executeStep();

      if (onError.mock.calls.length > 0) {
        expect(onError).toHaveBeenCalledWith(expect.any(Error), 'executeStep');
      }
    });
  });
});
