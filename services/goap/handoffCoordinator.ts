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
    _nextAction: AgentAction,
  ): { valid: boolean; reason?: string | undefined; warnings?: string[] | undefined } {
    const warnings: string[] = [];

    // Quality Gate 1: Low Confidence Safety Routing
    const safetyValidation = this.validateSafetyCalibration(nextAgent, currentState);
    if (!safetyValidation.valid) return safetyValidation;

    // Quality Gate 2: Sequential Dependencies
    const seqValidation = this.validateSequentialDependency(nextAgent, currentState);
    if (!seqValidation.valid) return seqValidation;

    // Quality Gate 3: State Consistency
    const stateValidation = this.validateStateConsistency(nextAgent, currentState);
    if (!stateValidation.valid) return stateValidation;

    // Quality Gate 4: Confidence Thresholds
    const confValidation = this.validateConfidenceThreshold(nextAgent, currentState);
    if (!confValidation.valid) return confValidation;

    return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
  }

  private validateSafetyCalibration(
    nextAgent: string,
    currentState: WorldState,
  ): { valid: boolean; reason?: string | undefined } {
    if (currentState.is_low_confidence === true && nextAgent === 'image-preprocessing-agent') {
      return {
        valid: false,
        reason:
          'Low-confidence detection MUST be routed through safety-calibration-agent before preprocessing',
      };
    }
    return { valid: true };
  }

  private validateSequentialDependency(
    nextAgent: string,
    currentState: WorldState,
  ): { valid: boolean; reason?: string | undefined } {
    // Image verification must precede skin tone detection
    if (nextAgent === 'skin-tone-detection-agent' && currentState.image_verified !== true) {
      return {
        valid: false,
        reason:
          'skin-tone-detection-agent requires image_verified=true (image-verification-agent must run first)',
      };
    }

    // Lesion detection requires preprocessing
    if (nextAgent === 'lesion-detection-agent' && currentState.image_preprocessed !== true) {
      return {
        valid: false,
        reason:
          'lesion-detection-agent requires image_preprocessed=true (image-preprocessing-agent must run first)',
      };
    }

    // Similarity search requires lesion detection
    if (nextAgent === 'similarity-search-agent' && currentState.lesions_detected !== true) {
      return {
        valid: false,
        reason:
          'similarity-search-agent requires lesions_detected=true (lesion-detection-agent must run first)',
      };
    }

    return { valid: true };
  }

  private validateStateConsistency(
    nextAgent: string,
    currentState: WorldState,
  ): { valid: boolean; reason?: string | undefined } {
    // Feature extraction requires valid skin tone
    if (nextAgent === 'feature-extraction-agent' && currentState.skin_tone === 'unknown') {
      return {
        valid: false,
        reason: 'feature-extraction-agent requires valid skin_tone (cannot be "unknown")',
      };
    }

    return { valid: true };
  }

  private validateConfidenceThreshold(
    _nextAgent: string,
    currentState: WorldState,
  ): { valid: boolean; reason?: string | undefined } {
    if (
      currentState.confidence_threshold !== undefined &&
      (currentState.confidence_threshold < 0 || currentState.confidence_threshold > 1)
    ) {
      return {
        valid: false,
        reason: 'confidence_threshold must be between 0 and 1',
      };
    }
    return { valid: true };
  }

  /**
   * Attempts to correct common state inconsistencies before handoff
   */
  autoCorrectState(currentState: WorldState, nextAgent: string): WorldState {
    const correctedState = { ...currentState };

    // Auto-set default confidence threshold if missing
    if (
      nextAgent === 'lesion-detection-agent' &&
      correctedState.confidence_threshold === undefined
    ) {
      correctedState.confidence_threshold = 0.65;
    }

    // Auto-fix unknown skin tone if calibration was done
    if (
      nextAgent === 'feature-extraction-agent' &&
      correctedState.skin_tone === 'unknown' &&
      correctedState.calibration_complete === true
    ) {
      correctedState.skin_tone = 'III';
    }

    return correctedState;
  }
}
