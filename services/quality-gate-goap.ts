/**
 * GOAP System for CI Check Coordination in Dermatology Orchestrator
 *
 * This system coordinates 6 specialized agents to fix failing CI checks:
 * 1. ESLint Agent - Fix ESLint linting issues
 * 2. Formatting Agent - Fix code formatting and style issues
 * 3. Unit Tests Agent - Fix unit test failures and coverage issues
 * 4. E2E Tests Agent - Fix end-to-end test failures
 * 5. SonarCloud Agent - Fix code quality and security issues from SonarCloud
 * 6. Code Complexity Agent - Reduce code complexity and technical debt
 */

// ============================================================================
// WORLD STATE REPRESENTATION
// ============================================================================

/**
 * World state representation for CI check coordination
 * Tracks the status of all CI check components
 */
// Type alias for backwards compatibility
export type QualityGateWorldState = CICheckWorldState;

// Import the goal definition
import {
  eslintConfigActions,
  testRefactorActions,
  huskyHookActions,
  ciFixActions,
  qualityGateActions,
} from './executors/quality-gate-actions';

import type { CI_CHECK_GOAL } from './executors/quality-gate-goals';
// Import action arrays

export interface CICheckWorldState {
  // Core CI check flags
  eslint_passing: boolean;
  npm_audit_passing: boolean;
  code_complexity_passing: boolean;
  formatting_passing: boolean;
  unit_tests_passing: boolean;
  e2e_tests_passing: boolean;
  sonarcloud_passing: boolean;
  all_ci_checks_passing: boolean;

  // Detailed state tracking
  eslint_status: {
    error_count: number;
    warning_count: number;
    critical_errors_fixed: boolean;
    rules_configured: boolean;
  };

  npm_audit_status: {
    vulnerabilities_count: number;
    vulnerabilities_fixed: boolean;
  };

  formatting_status: {
    files_formatted: number;
    total_files: number;
    style_guide_compliant: boolean;
    auto_fix_applied: boolean;
  };

  unit_tests_status: {
    tests_passing: number;
    total_tests: number;
    coverage_percentage: number;
    minimum_coverage_met: boolean;
  };

  e2e_tests_status: {
    scenarios_passing: number;
    total_scenarios: number;
    critical_paths_covered: boolean;
    flaky_tests_identified: boolean;
  };

  sonarcloud_status: {
    bugs_count: number;
    vulnerabilities_count: number;
    code_smells_count: number;
    quality_gate_status: string;
  };

  code_complexity_status: {
    average_complexity: number;
    max_complexity: number;
    files_above_threshold: number;
    complexity_reduced: boolean;
  };

  // Metadata
  current_attempt: number;
  last_agent_executed: string | null;
  error_log: string[];
  timestamp: number;
  [key: string]: boolean | number | string | string[] | null | unknown;
}

// ============================================================================
// INITIAL WORLD STATE
// ============================================================================

/**
 * Creates the initial world state with all failing CI checks
 */
export function createInitialCICheckState(): CICheckWorldState {
  return {
    // Core CI check flags - all initially false
    eslint_passing: false,
    npm_audit_passing: false,
    code_complexity_passing: false,
    formatting_passing: false,
    unit_tests_passing: false,
    e2e_tests_passing: false,
    sonarcloud_passing: false,
    all_ci_checks_passing: false,

    // Detailed state tracking
    eslint_status: {
      error_count: 15, // Initial error count
      warning_count: 32,
      critical_errors_fixed: false,
      rules_configured: false,
    },

    npm_audit_status: {
      vulnerabilities_count: 2, // Moderate vulnerabilities from micromatch
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

    // Metadata
    current_attempt: 0,
    last_agent_executed: null,
    error_log: [],
    timestamp: Date.now(),
  };
}

// ============================================================================
// ACTION INTERFACE
// ============================================================================

/**
 * Base interface for all CI check agent actions
 */
export interface CICheckAction {
  name: string;
  agent: string;
  preconditions: (_state: CICheckWorldState) => boolean;
  effects: (_state: CICheckWorldState) => CICheckWorldState;
  cost: number;
  target?: string;
  duration?: number;
  onFailure?: (_state: CICheckWorldState, _error: Error) => CICheckWorldState;
}

// Type alias for backwards compatibility
export type QualityGateAction = CICheckAction;

// ============================================================================
// PLANNING HELPER FUNCTIONS
// ============================================================================

/**
 * Heuristic function for A* search - estimates remaining cost
 */
export function estimateRemainingCost(_state: CICheckWorldState): number {
  let remaining = 0;

  if (!_state.eslint_passing) remaining += 3;
  if (!_state.npm_audit_passing) remaining += 2;
  if (!_state.code_complexity_passing) remaining += 6;
  if (!_state.formatting_passing) remaining += 2;
  if (!_state.unit_tests_passing) remaining += 5;
  if (!_state.e2e_tests_passing) remaining += 7;
  if (!_state.sonarcloud_passing) remaining += 4;
  if (!_state.all_ci_checks_passing) remaining += 1;

  return remaining;
}

/**
 * Check if goal is satisfied
 */
export function isGoalSatisfied(_state: CICheckWorldState, goal: typeof CI_CHECK_GOAL): boolean {
  return Object.entries(goal.targetState).every(([key, value]) => {
    const stateKey = key as keyof CICheckWorldState;
    return _state[stateKey] === value;
  });
}

/**
 * Get all available actions for current state
 */
export function getAvailableActions(_state: CICheckWorldState): CICheckAction[] {
  const allActions = [
    ...eslintConfigActions,
    ...testRefactorActions,
    ...huskyHookActions,
    ...ciFixActions,
    ...qualityGateActions,
  ];

  return allActions.filter((action) => action.preconditions(_state));
}

/**
 * Execute action and return new state
 */
export function executeAction(_state: CICheckWorldState, action: CICheckAction): CICheckWorldState {
  try {
    const newState = action.effects(_state);
    newState.timestamp = Date.now();
    return newState;
  } catch (error) {
    if (action.onFailure) {
      return action.onFailure(_state, error as Error);
    }
    // Add error to log and return modified state
    const errorState = { ..._state };
    errorState.error_log.push(`Action ${action.name} failed: ${(error as Error).message}`);
    return errorState;
  }
}

// ============================================================================
// BACKWARDS COMPATIBILITY ALIASES
// ============================================================================

// Backwards compatibility aliases
export const createInitialQualityGateState = createInitialCICheckState;
export { CICheckCoordinationProtocol } from './executors/quality-gate-coordination';
export { CICheckCoordinationProtocol as QualityGateCoordinationProtocol } from './executors/quality-gate-coordination';
export { CI_CHECK_GOAL as QUALITY_GATE_GOAL } from './executors/quality-gate-goals';

// Re-export action arrays for backwards compatibility
export {
  eslintConfigActions,
  formattingActions,
  unitTestsActions,
  e2eTestsActions,
  sonarcloudActions,
  codeComplexityActions,
  eslintActions,
  testRefactorActions,
  huskyHookActions,
  ciFixActions,
  qualityGateActions,
} from './executors/quality-gate-actions';
