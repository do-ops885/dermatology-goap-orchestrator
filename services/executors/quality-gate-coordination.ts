/**
 * Quality Gate Coordination Protocol
 *
 * Agent coordination logic for the quality gate GOAP system
 */

import {
  eslintActions,
  formattingActions,
  unitTestsActions,
  e2eTestsActions,
  sonarcloudActions,
  codeComplexityActions,
} from './quality-gate-actions';

import type { CICheckWorldState, CICheckAction } from '../quality-gate-goap';

export class CICheckCoordinationProtocol {
  /**
   * Determines the next agent to execute based on current state
   */
  determineNextAgent(_state: CICheckWorldState): {
    agent: string;
    action: CICheckAction;
    dependencies: string[];
  } | null {
    // Sequential dependency chain - ESLint can run first
    if (!_state.eslint_passing) {
      const action = eslintActions.find((a) => a.preconditions(_state));
      if (action) {
        return {
          agent: 'ESLintAgent',
          action,
          dependencies: ['none - starting agent'],
        };
      }
    }

    // Formatting can run in parallel with ESLint, but let's keep sequential for simplicity
    if (_state.eslint_passing && !_state.formatting_passing) {
      const action = formattingActions.find((a) => a.preconditions(_state));
      if (action) {
        return {
          agent: 'FormattingAgent',
          action,
          dependencies: ['ESLintAgent - eslint must pass first'],
        };
      }
    }

    // Unit tests depend on formatting being done
    if (_state.formatting_passing && !_state.unit_tests_passing) {
      const action = unitTestsActions.find((a) => a.preconditions(_state));
      if (action) {
        return {
          agent: 'UnitTestsAgent',
          action,
          dependencies: ['FormattingAgent - code must be formatted first'],
        };
      }
    }

    // E2E tests can run after unit tests
    if (_state.unit_tests_passing && !_state.e2e_tests_passing) {
      const action = e2eTestsActions.find((a) => a.preconditions(_state));
      if (action) {
        return {
          agent: 'E2ETestsAgent',
          action,
          dependencies: ['UnitTestsAgent - unit tests must pass first'],
        };
      }
    }

    // SonarCloud can run after basic tests pass
    if (_state.e2e_tests_passing && !_state.sonarcloud_passing) {
      const action = sonarcloudActions.find((a) => a.preconditions(_state));
      if (action) {
        return {
          agent: 'SonarCloudAgent',
          action,
          dependencies: ['E2ETestsAgent - e2e tests must pass first'],
        };
      }
    }

    // Code complexity can run after SonarCloud
    if (_state.sonarcloud_passing && !_state.code_complexity_passing) {
      const action = codeComplexityActions.find((a) => a.preconditions(_state));
      if (action) {
        return {
          agent: 'CodeComplexityAgent',
          action,
          dependencies: ['SonarCloudAgent - sonarcloud must pass first'],
        };
      }
    }

    // Final check for all CI passing
    if (_state.code_complexity_passing && !_state.all_ci_checks_passing) {
      // This would be a final aggregation action, but for now return null
      return null;
    }

    return null; // No more actions needed
  }

  /**
   * Validates agent handoff requirements
   */
  validateHandoff(
    currentAgent: string,
    nextAgent: string,
    _state: CICheckWorldState,
  ): {
    valid: boolean;
    reason?: string;
  } {
    const agentOrder = [
      'ESLintAgent',
      'FormattingAgent',
      'UnitTestsAgent',
      'E2ETestsAgent',
      'SonarCloudAgent',
      'CodeComplexityAgent',
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
      case 'FormattingAgent':
        if (!_state.eslint_passing) {
          return { valid: false, reason: 'ESLint must pass before formatting' };
        }
        break;

      case 'UnitTestsAgent':
        if (!_state.formatting_passing) {
          return { valid: false, reason: 'Code must be formatted before running unit tests' };
        }
        break;

      case 'E2ETestsAgent':
        if (!_state.unit_tests_passing) {
          return { valid: false, reason: 'Unit tests must pass before e2e tests' };
        }
        break;

      case 'SonarCloudAgent':
        if (!_state.e2e_tests_passing) {
          return { valid: false, reason: 'E2E tests must pass before SonarCloud analysis' };
        }
        break;

      case 'CodeComplexityAgent':
        if (!_state.sonarcloud_passing) {
          return { valid: false, reason: 'SonarCloud must pass before complexity analysis' };
        }
        break;
    }

    return { valid: true };
  }
}
