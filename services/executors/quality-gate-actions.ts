/**
 * Quality Gate Actions
 *
 * Action definitions for the quality gate GOAP system
 */

import type { CICheckAction } from '../quality-gate-goap';

// ESLint Agent Actions
export const eslintConfigActions: CICheckAction[] = [
  {
    name: 'fix-critical-eslint-errors',
    agent: 'ESLintAgent',
    preconditions: (state) =>
      !state.eslint_status.critical_errors_fixed && state.eslint_status.error_count > 0,
    effects: (state) => {
      const newState = { ...state };
      newState.eslint_status.error_count = Math.max(0, state.eslint_status.error_count - 10);
      newState.eslint_status.critical_errors_fixed = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'fix-critical-eslint-errors';
      return newState;
    },
    cost: 2,
  },

  {
    name: 'configure-eslint-rules',
    agent: 'ESLintAgent',
    preconditions: (state) => !state.eslint_status.rules_configured,
    effects: (state) => {
      const newState = { ...state };
      newState.eslint_status.rules_configured = true;
      newState.eslint_status.warning_count = Math.max(0, state.eslint_status.warning_count - 15);
      newState.eslint_passing = state.eslint_status.error_count === 0;
      newState.current_attempt++;
      newState.last_agent_executed = 'configure-eslint-rules';
      return newState;
    },
    cost: 1,
  },
];

// Formatting Agent Actions
export const formattingActions: CICheckAction[] = [
  {
    name: 'apply-auto-formatting',
    agent: 'FormattingAgent',
    preconditions: (state) =>
      !state.formatting_status.auto_fix_applied &&
      state.formatting_status.files_formatted < state.formatting_status.total_files,
    effects: (state) => {
      const newState = { ...state };
      newState.formatting_status.files_formatted = Math.min(
        state.formatting_status.total_files,
        state.formatting_status.files_formatted + 50,
      );
      newState.formatting_status.auto_fix_applied = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'apply-auto-formatting';
      return newState;
    },
    cost: 2,
  },

  {
    name: 'verify-style-compliance',
    agent: 'FormattingAgent',
    preconditions: (state) =>
      state.formatting_status.files_formatted === state.formatting_status.total_files,
    effects: (state) => {
      const newState = { ...state };
      newState.formatting_status.style_guide_compliant = true;
      newState.formatting_passing = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'verify-style-compliance';
      return newState;
    },
    cost: 1,
  },
];

// Unit Tests Agent Actions
export const unitTestsActions: CICheckAction[] = [
  {
    name: 'fix-failing-tests',
    agent: 'UnitTestsAgent',
    preconditions: (state) =>
      state.unit_tests_status.tests_passing < state.unit_tests_status.total_tests,
    effects: (state) => {
      const newState = { ...state };
      newState.unit_tests_status.tests_passing = Math.min(
        state.unit_tests_status.total_tests,
        state.unit_tests_status.tests_passing + 15,
      );
      newState.current_attempt++;
      newState.last_agent_executed = 'fix-failing-tests';
      return newState;
    },
    cost: 3,
  },

  {
    name: 'improve-test-coverage',
    agent: 'UnitTestsAgent',
    preconditions: (state) =>
      !state.unit_tests_status.minimum_coverage_met &&
      state.unit_tests_status.coverage_percentage < 85,
    effects: (state) => {
      const newState = { ...state };
      newState.unit_tests_status.coverage_percentage = Math.min(
        90,
        state.unit_tests_status.coverage_percentage + 8,
      );
      newState.unit_tests_status.minimum_coverage_met =
        state.unit_tests_status.coverage_percentage >= 85;
      newState.unit_tests_passing =
        state.unit_tests_status.tests_passing === state.unit_tests_status.total_tests &&
        state.unit_tests_status.minimum_coverage_met;
      newState.current_attempt++;
      newState.last_agent_executed = 'improve-test-coverage';
      return newState;
    },
    cost: 2,
  },
];

// E2E Tests Agent Actions
export const e2eTestsActions: CICheckAction[] = [
  {
    name: 'fix-failing-scenarios',
    agent: 'E2ETestsAgent',
    preconditions: (state) =>
      state.e2e_tests_status.scenarios_passing < state.e2e_tests_status.total_scenarios,
    effects: (state) => {
      const newState = { ...state };
      newState.e2e_tests_status.scenarios_passing = Math.min(
        state.e2e_tests_status.total_scenarios,
        state.e2e_tests_status.scenarios_passing + 3,
      );
      newState.current_attempt++;
      newState.last_agent_executed = 'fix-failing-scenarios';
      return newState;
    },
    cost: 4,
  },

  {
    name: 'identify-flaky-tests',
    agent: 'E2ETestsAgent',
    preconditions: (state) => !state.e2e_tests_status.flaky_tests_identified,
    effects: (state) => {
      const newState = { ...state };
      newState.e2e_tests_status.flaky_tests_identified = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'identify-flaky-tests';
      return newState;
    },
    cost: 2,
  },

  {
    name: 'ensure-critical-paths',
    agent: 'E2ETestsAgent',
    preconditions: (state) =>
      state.e2e_tests_status.scenarios_passing === state.e2e_tests_status.total_scenarios,
    effects: (state) => {
      const newState = { ...state };
      newState.e2e_tests_status.critical_paths_covered = true;
      newState.e2e_tests_passing = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'ensure-critical-paths';
      return newState;
    },
    cost: 1,
  },
];

// SonarCloud Agent Actions
export const sonarcloudActions: CICheckAction[] = [
  {
    name: 'fix-critical-bugs',
    agent: 'SonarCloudAgent',
    preconditions: (state) => state.sonarcloud_status.bugs_count > 0,
    effects: (state) => {
      const newState = { ...state };
      newState.sonarcloud_status.bugs_count = Math.max(0, state.sonarcloud_status.bugs_count - 5);
      newState.current_attempt++;
      newState.last_agent_executed = 'fix-critical-bugs';
      return newState;
    },
    cost: 3,
  },

  {
    name: 'fix-vulnerabilities',
    agent: 'SonarCloudAgent',
    preconditions: (state) => state.sonarcloud_status.vulnerabilities_count > 0,
    effects: (state) => {
      const newState = { ...state };
      newState.sonarcloud_status.vulnerabilities_count = Math.max(
        0,
        state.sonarcloud_status.vulnerabilities_count - 2,
      );
      newState.current_attempt++;
      newState.last_agent_executed = 'fix-vulnerabilities';
      return newState;
    },
    cost: 4,
  },

  {
    name: 'reduce-code-smells',
    agent: 'SonarCloudAgent',
    preconditions: (state) => state.sonarcloud_status.code_smells_count > 20,
    effects: (state) => {
      const newState = { ...state };
      newState.sonarcloud_status.code_smells_count = Math.max(
        0,
        state.sonarcloud_status.code_smells_count - 25,
      );
      newState.sonarcloud_status.quality_gate_status =
        state.sonarcloud_status.bugs_count === 0 &&
        state.sonarcloud_status.vulnerabilities_count === 0 &&
        state.sonarcloud_status.code_smells_count <= 20
          ? 'PASSED'
          : 'FAILED';
      newState.sonarcloud_passing = state.sonarcloud_status.quality_gate_status === 'PASSED';
      newState.current_attempt++;
      newState.last_agent_executed = 'reduce-code-smells';
      return newState;
    },
    cost: 2,
  },
];

// Code Complexity Agent Actions
export const codeComplexityActions: CICheckAction[] = [
  {
    name: 'refactor-high-complexity-files',
    agent: 'CodeComplexityAgent',
    preconditions: (state) => state.code_complexity_status.files_above_threshold > 0,
    effects: (state) => {
      const newState = { ...state };
      newState.code_complexity_status.files_above_threshold = Math.max(
        0,
        state.code_complexity_status.files_above_threshold - 3,
      );
      newState.code_complexity_status.max_complexity = Math.max(
        15,
        state.code_complexity_status.max_complexity - 5,
      );
      newState.code_complexity_status.average_complexity = Math.max(
        8,
        state.code_complexity_status.average_complexity - 2,
      );
      newState.current_attempt++;
      newState.last_agent_executed = 'refactor-high-complexity-files';
      return newState;
    },
    cost: 5,
  },

  {
    name: 'optimize-performance',
    agent: 'CodeComplexityAgent',
    preconditions: (state) => state.code_complexity_status.average_complexity > 10,
    effects: (state) => {
      const newState = { ...state };
      newState.code_complexity_status.average_complexity = Math.max(
        8,
        state.code_complexity_status.average_complexity - 3,
      );
      newState.code_complexity_status.complexity_reduced = true;
      newState.code_complexity_passing = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'optimize-performance';
      return newState;
    },
    cost: 3,
  },
];

// Combined actions for backwards compatibility
export const eslintActions = eslintConfigActions;
export const testRefactorActions = [...unitTestsActions, ...e2eTestsActions];
export const huskyHookActions: CICheckAction[] = []; // Empty for now
export const ciFixActions: CICheckAction[] = []; // Empty for now
export const qualityGateActions = [...sonarcloudActions, ...codeComplexityActions];
