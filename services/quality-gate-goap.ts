/**
 * GOAP System for Quality Gate Issues in Dermatology Orchestrator
 *
 * This system coordinates 5 specialized agents to fix quality gate failures:
 * 1. ESLint Config Agent - Fix eslint.config.js configuration
 * 2. Test Refactor Agent - Split large test files and fix type issues
 * 3. Husky Hook Agent - Fix pre-commit hook execution failures
 * 4. CI Fix Agent - Resolve GitHub Actions failures
 * 5. Quality Gate Agent - Fix remaining linting issues and ensure all checks pass
 */

// ============================================================================
// WORLD STATE REPRESENTATION
// ============================================================================

/**
 * World state representation for quality gate issues
 * Tracks the status of all quality gate components
 */
export interface QualityGateWorldState {
  // Core quality gate flags
  eslint_config_fixed: boolean;
  test_files_refactored: boolean;
  husky_hook_working: boolean;
  ci_passing: boolean;
  quality_gates_clear: boolean;

  // Detailed state tracking
  eslint_config: {
    has_jest_dom_plugin: boolean;
    has_test_globals: boolean;
    jest_dom_version: string | null;
    test_globals_configured: boolean;
  };

  test_files: {
    diagnostic_summary_size: number;
    diagnostic_summary_under_limit: boolean;
    type_errors_fixed: boolean;
    test_coverage_maintained: boolean;
  };

  husky_hook: {
    pre_commit_executable: boolean;
    npm_commands_working: boolean;
    quality_gate_passing: boolean;
  };

  ci_systems: {
    lint_workflow_passing: boolean;
    e2e_workflow_passing: boolean;
    code_quality_workflow_passing: boolean;
    all_jobs_successful: boolean;
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
 * Creates the initial world state with all quality gate issues
 */
export function createInitialQualityGateState(): QualityGateWorldState {
  return {
    // Core quality gate flags - all initially false
    eslint_config_fixed: false,
    test_files_refactored: false,
    husky_hook_working: false,
    ci_passing: false,
    quality_gates_clear: false,

    // Detailed state tracking
    eslint_config: {
      has_jest_dom_plugin: false,
      has_test_globals: false,
      jest_dom_version: null,
      test_globals_configured: false,
    },

    test_files: {
      diagnostic_summary_size: 763, // Current size from analysis
      diagnostic_summary_under_limit: false,
      type_errors_fixed: false,
      test_coverage_maintained: false,
    },

    husky_hook: {
      pre_commit_executable: false,
      npm_commands_working: false,
      quality_gate_passing: false,
    },

    ci_systems: {
      lint_workflow_passing: false,
      e2e_workflow_passing: false,
      code_quality_workflow_passing: false,
      all_jobs_successful: false,
    },

    // Metadata
    current_attempt: 1,
    last_agent_executed: null,
    error_log: [],
    timestamp: Date.now(),
  };
}

// ============================================================================
// AGENT ACTIONS
// ============================================================================

/**
 * Base interface for all quality gate agent actions
 */
export interface QualityGateAction {
  name: string;
  agent: string;
  preconditions: (_state: QualityGateWorldState) => boolean;
  effects: (_state: QualityGateWorldState) => QualityGateWorldState;
  cost: number;
  target?: string;
  duration?: number;
  onFailure?: (_state: QualityGateWorldState, _error: Error) => QualityGateWorldState;
}

// ESLint Config Agent Actions
export const eslintConfigActions: QualityGateAction[] = [
  {
    name: 'add-jest-dom-plugin',
    agent: 'ESLintConfigAgent',
    preconditions: (state) => !state.eslint_config.has_jest_dom_plugin,
    effects: (state) => {
      const newState = { ...state };
      newState.eslint_config.has_jest_dom_plugin = true;
      newState.eslint_config.jest_dom_version = '6.0.2';
      newState.current_attempt++;
      newState.last_agent_executed = 'add-jest-dom-plugin';
      return newState;
    },
    cost: 1,
  },

  {
    name: 'configure-test-globals',
    agent: 'ESLintConfigAgent',
    preconditions: (state) => !state.eslint_config.has_test_globals,
    effects: (state) => {
      const newState = { ...state };
      newState.eslint_config.has_test_globals = true;
      newState.eslint_config.test_globals_configured = true;
      newState.eslint_config_fixed = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'configure-test-globals';
      return newState;
    },
    cost: 2,
  },
];

// Test Refactor Agent Actions
export const testRefactorActions: QualityGateAction[] = [
  {
    name: 'split-diagnostic-summary-test',
    agent: 'TestRefactorAgent',
    preconditions: (state) => state.test_files.diagnostic_summary_size > 500,
    effects: (state) => {
      const newState = { ...state };
      newState.test_files.diagnostic_summary_size = 450; // After splitting
      newState.test_files.diagnostic_summary_under_limit = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'split-diagnostic-summary-test';
      return newState;
    },
    cost: 3,
  },

  {
    name: 'fix-type-errors',
    agent: 'TestRefactorAgent',
    preconditions: (state) => state.eslint_config_fixed && !state.test_files.type_errors_fixed,
    effects: (state) => {
      const newState = { ...state };
      newState.test_files.type_errors_fixed = true;
      newState.test_files_refactored = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'fix-type-errors';
      return newState;
    },
    cost: 2,
  },
];

// Husky Hook Agent Actions
export const huskyHookActions: QualityGateAction[] = [
  {
    name: 'fix-npm-execution',
    agent: 'HuskyHookAgent',
    preconditions: (state) => !state.husky_hook.npm_commands_working,
    effects: (state) => {
      const newState = { ...state };
      newState.husky_hook.npm_commands_working = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'fix-npm-execution';
      return newState;
    },
    cost: 2,
  },

  {
    name: 'verify-husky-hook',
    agent: 'HuskyHookAgent',
    preconditions: (state) =>
      state.husky_hook.npm_commands_working && !state.husky_hook.quality_gate_passing,
    effects: (state) => {
      const newState = { ...state };
      newState.husky_hook.pre_commit_executable = true;
      newState.husky_hook.quality_gate_passing = true;
      newState.husky_hook_working = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'verify-husky-hook';
      return newState;
    },
    cost: 1,
  },
];

// CI Fix Agent Actions
export const ciFixActions: QualityGateAction[] = [
  {
    name: 'debug-lint-workflow',
    agent: 'CIFixAgent',
    preconditions: (state) => state.eslint_config_fixed && !state.ci_systems.lint_workflow_passing,
    effects: (state) => {
      const newState = { ...state };
      newState.ci_systems.lint_workflow_passing = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'debug-lint-workflow';
      return newState;
    },
    cost: 2,
  },

  {
    name: 'fix-e2e-workflow',
    agent: 'CIFixAgent',
    preconditions: (state) => state.test_files_refactored && !state.ci_systems.e2e_workflow_passing,
    effects: (state) => {
      const newState = { ...state };
      newState.ci_systems.e2e_workflow_passing = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'fix-e2e-workflow';
      return newState;
    },
    cost: 3,
  },

  {
    name: 'resolve-code-quality',
    agent: 'CIFixAgent',
    preconditions: (state) =>
      state.husky_hook_working && !state.ci_systems.code_quality_workflow_passing,
    effects: (state) => {
      const newState = { ...state };
      newState.ci_systems.code_quality_workflow_passing = true;
      newState.ci_systems.all_jobs_successful = true;
      newState.ci_passing = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'resolve-code-quality';
      return newState;
    },
    cost: 2,
  },
];

// Quality Gate Agent Actions
export const qualityGateActions: QualityGateAction[] = [
  {
    name: 'final-lint-fix',
    agent: 'QualityGateAgent',
    preconditions: (state) => state.ci_passing && !state.quality_gates_clear,
    effects: (state) => {
      const newState = { ...state };
      newState.quality_gates_clear = true;
      newState.current_attempt++;
      newState.last_agent_executed = 'final-lint-fix';
      return newState;
    },
    cost: 1,
    onFailure: (state, error) => {
      const newState = { ...state };
      newState.error_log.push(`Quality Gate Agent failed: ${error.message}`);
      return newState;
    },
  },
];

// ============================================================================
// COORDINATION PROTOCOLS
// ============================================================================

/**
 * Agent coordination protocol for sequential execution
 */
export class QualityGateCoordinationProtocol {
  /**
   * Determines the next agent to execute based on current state
   */
  determineNextAgent(_state: QualityGateWorldState): {
    agent: string;
    action: QualityGateAction;
    dependencies: string[];
  } | null {
    // Sequential dependency chain
    if (!_state.eslint_config_fixed) {
      const action = eslintConfigActions.find((a) => a.preconditions(_state));
      if (action) {
        return {
          agent: 'ESLintConfigAgent',
          action,
          dependencies: ['none - starting agent'],
        };
      }
    }

    if (_state.eslint_config_fixed && !_state.test_files_refactored) {
      const action = testRefactorActions.find((a) => a.preconditions(_state));
      if (action) {
        return {
          agent: 'TestRefactorAgent',
          action,
          dependencies: ['ESLintConfigAgent - eslint config must be fixed first'],
        };
      }
    }

    if (_state.test_files_refactored && !_state.husky_hook_working) {
      const action = huskyHookActions.find((a) => a.preconditions(_state));
      if (action) {
        return {
          agent: 'HuskyHookAgent',
          action,
          dependencies: ['TestRefactorAgent - tests must be refactored first'],
        };
      }
    }

    if (_state.husky_hook_working && !_state.ci_passing) {
      const action = ciFixActions.find((a) => a.preconditions(_state));
      if (action) {
        return {
          agent: 'CIFixAgent',
          action,
          dependencies: ['HuskyHookAgent - husky must be working first'],
        };
      }
    }

    if (_state.ci_passing && !_state.quality_gates_clear) {
      const action = qualityGateActions.find((a) => a.preconditions(_state));
      if (action) {
        return {
          agent: 'QualityGateAgent',
          action,
          dependencies: ['CIFixAgent - CI must be passing first'],
        };
      }
    }

    return null; // No more actions needed
  }

  /**
   * Validates agent handoff requirements
   */
  validateHandoff(
    currentAgent: string,
    nextAgent: string,
    _state: QualityGateWorldState,
  ): {
    valid: boolean;
    reason?: string;
  } {
    const agentOrder = [
      'ESLintConfigAgent',
      'TestRefactorAgent',
      'HuskyHookAgent',
      'CIFixAgent',
      'QualityGateAgent',
    ];

    const currentIndex = agentOrder.indexOf(currentAgent);
    const nextIndex = agentOrder.indexOf(nextAgent);

    if (nextIndex === -1) {
      return { valid: false, reason: `Unknown agent: ${nextAgent}` };
    }

    if (nextIndex < currentIndex) {
      return { valid: false, reason: `Cannot go backwards in agent sequence` };
    }

    if (nextIndex === currentIndex) {
      return { valid: true }; // Same agent, multiple actions
    }

    // Validate prerequisites for next agent
    switch (nextAgent) {
      case 'TestRefactorAgent':
        if (!_state.eslint_config_fixed) {
          return { valid: false, reason: 'ESLint config must be fixed before test refactoring' };
        }
        break;

      case 'HuskyHookAgent':
        if (!_state.test_files_refactored) {
          return { valid: false, reason: 'Tests must be refactored before fixing husky hook' };
        }
        break;

      case 'CIFixAgent':
        if (!_state.husky_hook_working) {
          return { valid: false, reason: 'Husky hook must be working before fixing CI' };
        }
        break;

      case 'QualityGateAgent':
        if (!_state.ci_passing) {
          return { valid: false, reason: 'CI must be passing before final quality gate fix' };
        }
        break;
    }

    return { valid: true };
  }
}

// ============================================================================
// GOAL DEFINITIONS
// ============================================================================

/**
 * Primary goal for the quality gate system
 */
export const QUALITY_GATE_GOAL = {
  name: 'fix_all_quality_gates',
  description: 'Fix all quality gate issues to ensure CI/CD pipeline passes',
  targetState: {
    eslint_config_fixed: true,
    test_files_refactored: true,
    husky_hook_working: true,
    ci_passing: true,
    quality_gates_clear: true,
  },
  priority: 1,
} as const;

/**
 * Intermediate goals for debugging and partial progress
 */
export const INTERMEDIATE_GOALS = [
  {
    name: 'fix_eslint_config',
    description: 'Fix ESLint configuration issues',
    targetState: { eslint_config_fixed: true },
    priority: 5,
  },
  {
    name: 'refactor_test_files',
    description: 'Refactor oversized test files and fix type issues',
    targetState: { test_files_refactored: true },
    priority: 4,
  },
  {
    name: 'fix_husky_hook',
    description: 'Fix pre-commit hook execution failures',
    targetState: { husky_hook_working: true },
    priority: 3,
  },
  {
    name: 'fix_ci_workflows',
    description: 'Resolve GitHub Actions failures',
    targetState: { ci_passing: true },
    priority: 2,
  },
] as const;

// ============================================================================
// PLANNING HELPER FUNCTIONS
// ============================================================================

/**
 * Heuristic function for A* search - estimates remaining cost
 */
export function estimateRemainingCost(_state: QualityGateWorldState): number {
  let remaining = 0;

  if (!_state.eslint_config_fixed) remaining += 3;
  if (!_state.test_files_refactored) remaining += 5;
  if (!_state.husky_hook_working) remaining += 3;
  if (!_state.ci_passing) remaining += 7;
  if (!_state.quality_gates_clear) remaining += 1;

  return remaining;
}

/**
 * Check if goal is satisfied
 */
export function isGoalSatisfied(
  _state: QualityGateWorldState,
  goal: typeof QUALITY_GATE_GOAL,
): boolean {
  return Object.entries(goal.targetState).every(([key, value]) => {
    const stateKey = key as keyof QualityGateWorldState;
    return _state[stateKey] === value;
  });
}

/**
 * Get all available actions for current state
 */
export function getAvailableActions(_state: QualityGateWorldState): QualityGateAction[] {
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
export function executeAction(
  _state: QualityGateWorldState,
  action: QualityGateAction,
): QualityGateWorldState {
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
