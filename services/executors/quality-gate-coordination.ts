/**
 * Quality Gate Coordination Protocol
 *
 * Agent coordination logic for the quality gate GOAP system
 */

import { AGENT_CODE_COMPLEXITY, AGENT_ESLINT, AGENT_SECURITY_AUDIT } from '../../config/constants';

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
    return (
      this.findSecurityAuditAction(_state) ??
      this.findEslintAction(_state) ??
      this.findCodeComplexityAction(_state) ??
      this.checkAllChecksPassing(_state)
    );
  }

  private findSecurityAuditAction(state: CICheckWorldState): {
    agent: string;
    action: CICheckAction;
    dependencies: string[];
  } | null {
    if (!state.npm_audit_passing) {
      const auditAction = securityAuditActions.find((a) => a.preconditions(state));
      if (auditAction) {
        return {
          agent: AGENT_SECURITY_AUDIT,
          action: auditAction,
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
      const eslintAction = eslintActions.find((a) => a.preconditions(state));
      if (eslintAction) {
        return {
          agent: AGENT_ESLINT,
          action: eslintAction,
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
      const complexityAction = codeComplexityActions.find((a) => a.preconditions(state));
      if (complexityAction) {
        return {
          agent: AGENT_CODE_COMPLEXITY,
          action: complexityAction,
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
    const agentOrder = [AGENT_SECURITY_AUDIT, AGENT_ESLINT, AGENT_CODE_COMPLEXITY];

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
      case AGENT_ESLINT:
        if (!_state.npm_audit_passing) {
          return { valid: false, reason: 'NPM audit must pass before ESLint' };
        }
        break;

      case AGENT_CODE_COMPLEXITY:
        if (!_state.eslint_passing) {
          return { valid: false, reason: 'ESLint must pass before code complexity analysis' };
        }
        break;
    }

    return { valid: true };
  }
}
