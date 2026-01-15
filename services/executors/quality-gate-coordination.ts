/**
 * Quality Gate Coordination Protocol
 *
 * Agent coordination logic for the quality gate GOAP system
 */

import { eslintActions, securityAuditActions, codeComplexityActions } from './quality-gate-actions';

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
    const result =
      this.findSecurityAuditAction(_state) ||
      this.findEslintAction(_state) ||
      this.findCodeComplexityAction(_state) ||
      this.checkAllChecksPassing(_state);

    return result;
  }

  private findSecurityAuditAction(state: CICheckWorldState): {
    agent: string;
    action: CICheckAction;
    dependencies: string[];
  } | null {
    if (!state.npm_audit_passing) {
      const action = securityAuditActions.find((a) => a.preconditions(state));
      if (action) {
        return {
          agent: 'SecurityAudit-Agent',
          action,
          dependencies: ['none - starting agent'],
        };
      }
    }
    return null;
  }

  private findEslintAction(state: CICheckWorldState): {
    agent: string;
    action: CICheckAction;
    dependencies: string[];
  } | null {
    if (state.npm_audit_passing && !state.eslint_passing) {
      const action = eslintActions.find((a) => a.preconditions(state));
      if (action) {
        return {
          agent: 'ESLint-Agent',
          action,
          dependencies: ['SecurityAudit-Agent - npm audit must pass first'],
        };
      }
    }
    return null;
  }

  private findCodeComplexityAction(state: CICheckWorldState): {
    agent: string;
    action: CICheckAction;
    dependencies: string[];
  } | null {
    if (state.eslint_passing && !state.code_complexity_passing) {
      const action = codeComplexityActions.find((a) => a.preconditions(state));
      if (action) {
        return {
          agent: 'CodeComplexity-Agent',
          action,
          dependencies: ['ESLint-Agent - eslint must pass first'],
        };
      }
    }
    return null;
  }

  private checkAllChecksPassing(state: CICheckWorldState): null {
    if (
      state.npm_audit_passing &&
      state.eslint_passing &&
      state.code_complexity_passing &&
      !state.all_ci_checks_passing
    ) {
      // This would be a final aggregation action, but for now return null
      return null;
    }
    return null;
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
    const agentOrder = ['SecurityAudit-Agent', 'ESLint-Agent', 'CodeComplexity-Agent'];

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
      case 'ESLint-Agent':
        if (!_state.npm_audit_passing) {
          return { valid: false, reason: 'NPM audit must pass before ESLint' };
        }
        break;

      case 'CodeComplexity-Agent':
        if (!_state.eslint_passing) {
          return { valid: false, reason: 'ESLint must pass before code complexity analysis' };
        }
        break;
    }

    return { valid: true };
  }
}
