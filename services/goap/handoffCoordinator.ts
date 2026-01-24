import type { AgentAction, WorldState } from '../../types';

/**
 * Agent Handoff Coordination Protocol
 * Ensures proper state management and quality gate validation during agent transitions
 */

export class AgentHandoffCoordinator {
  /**
   * Validates that an agent can safely hand off to the next agent in the pipeline
   */
  validateHandoff(
    _currentAgent: string,
    nextAgent: string,
    currentState: WorldState,
    nextAction: AgentAction,
  ): { valid: boolean; reason?: string | undefined; warnings?: string[] | undefined } {
    const warnings: string[] = [];

    // Quality Gate 1: Low Confidence Safety Routing (check first for specific error messages)
    const safetyValidation = this.validateSafetyCalibration(nextAgent, currentState);
    if (!safetyValidation.valid) return safetyValidation;

    // Quality Gate 2: Validate action preconditions
    const preconditionValidation = this.validateActionPreconditions(currentState, nextAction);
    if (!preconditionValidation.valid) return preconditionValidation;

    // Quality Gate 3: State Consistency Checks (adds warnings, doesn't fail)
    this.checkStateInconsistencies(currentState, nextAgent, warnings);

    return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
  }

  private validateActionPreconditions(
    currentState: WorldState,
    action: AgentAction,
  ): { valid: boolean; reason?: string | undefined } {
    for (const [key, requiredValue] of Object.entries(action.preconditions)) {
      const stateValue = (currentState as unknown as Record<string, unknown>)[key];
      if (stateValue !== requiredValue) {
        return {
          valid: false,
          reason: `Precondition not met: ${key} should be ${requiredValue}, but got ${stateValue}`,
        };
      }
    }
    return { valid: true };
  }

  private validateSafetyCalibration(
    nextAgent: string,
    currentState: WorldState,
  ): { valid: boolean; reason?: string | undefined } {
    // Safety-Calibration-Agent can only execute when is_low_confidence is true
    if (nextAgent === 'Safety-Calibration-Agent' && currentState.is_low_confidence !== true) {
      return {
        valid: false,
        reason: 'Safety-Calibration-Agent can only be executed when is_low_confidence is true',
      };
    }

    // Standard-Calibration-Agent cannot execute when is_low_confidence is true
    if (nextAgent === 'Standard-Calibration-Agent' && currentState.is_low_confidence === true) {
      return {
        valid: false,
        reason: 'Standard-Calibration-Agent cannot be executed when is_low_confidence is true',
      };
    }

    return { valid: true };
  }

  private checkStateInconsistencies(
    currentState: WorldState,
    _nextAgent: string,
    warnings: string[],
  ): void {
    // Check for inconsistency between confidence_score and is_low_confidence
    if (
      currentState.confidence_score !== undefined &&
      currentState.confidence_score < 0.65 &&
      currentState.is_low_confidence === false
    ) {
      warnings.push('State inconsistency: confidence_score < 0.65 but is_low_confidence is false');
    }
  }

  /**
   * Attempts to correct common state inconsistencies before handoff
   */
  autoCorrectState(currentState: WorldState, _nextAgent: string): WorldState {
    const correctedState = { ...currentState };

    // Auto-correct is_low_confidence based on confidence_score
    if (
      correctedState.confidence_score !== undefined &&
      correctedState.confidence_score < 0.65 &&
      !correctedState.is_low_confidence
    ) {
      correctedState.is_low_confidence = true;
    }

    return correctedState;
  }
}
