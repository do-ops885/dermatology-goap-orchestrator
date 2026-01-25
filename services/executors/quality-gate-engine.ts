/**
 * Quality Gate GOAP Engine
 *
 * Execution engine for the quality gate GOAP system
 */

import {
  type QualityGateWorldState,
  type QualityGateAction,
  createInitialQualityGateState,
  QualityGateCoordinationProtocol,
  executeAction,
  isGoalSatisfied,
  QUALITY_GATE_GOAL,
  type CICheckCoordinationProtocol,
} from '../quality-gate-goap';

/**
 * Main execution engine for the quality gate GOAP system
 */
export class QualityGateGoapEngine {
  private coordinator: CICheckCoordinationProtocol;
  private _state: QualityGateWorldState;
  private onStateChange?: ((_state: QualityGateWorldState) => void) | undefined;
  private onAgentExecute?: ((_agent: string, _action: QualityGateAction) => void) | undefined;
  private onError?: ((_error: Error, _context: string) => void) | undefined;

  constructor(options?: {
    onStateChange?: ((_state: QualityGateWorldState) => void) | undefined;
    onAgentExecute?: ((_agent: string, _action: QualityGateAction) => void) | undefined;
    onError?: ((_error: Error, _context: string) => void) | undefined;
  }) {
    this.coordinator = new QualityGateCoordinationProtocol();
    this._state = createInitialQualityGateState();
    this.onStateChange = options?.onStateChange;
    this.onAgentExecute = options?.onAgentExecute;
    this.onError = options?.onError;
  }

  /**
   * Get current world state
   */
  getState(): QualityGateWorldState {
    return { ...this._state };
  }

  /**
   * Execute one action step
   */
  async executeStep(): Promise<{
    success: boolean;
    action?: QualityGateAction;
    agent?: string;
    error?: Error;
  }> {
    try {
      // Determine next agent and action
      const nextAgent = this.coordinator.determineNextAgent(this._state);

      if (!nextAgent) {
        // No more actions - check if goal is satisfied
        if (isGoalSatisfied(this._state, QUALITY_GATE_GOAL)) {
          return { success: true };
        } else {
          throw new Error('No more actions available but goal not satisfied');
        }
      }

      // Validate preconditions
      if (!nextAgent.action.preconditions(this._state)) {
        throw new Error(`Preconditions not met for action: ${nextAgent.action.name}`);
      }

      // Execute action
      this.onAgentExecute?.(nextAgent.agent, nextAgent.action);
      this._state = executeAction(this._state, nextAgent.action);

      // Notify state change
      this.onStateChange?.(this._state);

      return {
        success: true,
        action: nextAgent.action,
        agent: nextAgent.agent,
      };
    } catch (error) {
      this.onError?.(error as Error, 'executeStep');
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Execute until goal is reached or no more actions available
   */
  async executeAll(): Promise<{
    success: boolean;
    finalState: QualityGateWorldState;
    steps: number;
    errors: Error[];
  }> {
    const errors: Error[] = [];
    let steps = 0;
    const maxSteps = 50; // Prevent infinite loops

    while (!isGoalSatisfied(this._state, QUALITY_GATE_GOAL) && steps < maxSteps) {
      steps++;

      const result = await this.executeStep();

      if (!result.success) {
        if (result.error !== undefined) {
          errors.push(result.error);
        }
        // If it's the final step and we can't proceed, break
        if (steps >= maxSteps) {
          break;
        }
      }
    }

    return {
      success: isGoalSatisfied(this._state, QUALITY_GATE_GOAL),
      finalState: this.getState(),
      steps,
      errors,
    };
  }

  /**
   * Execute until first failure or goal reached
   */
  async executeUntilFailure(): Promise<{
    success: boolean;
    finalState: QualityGateWorldState;
    steps: number;
    lastAction?: { agent: string; action: QualityGateAction } | undefined;
  }> {
    let steps = 0;
    const maxSteps = 50;
    let lastAction: { agent: string; action: QualityGateAction } | undefined;

    while (!isGoalSatisfied(this._state, QUALITY_GATE_GOAL) && steps < maxSteps) {
      steps++;

      const result = await this.executeStep();

      if (!result.success) {
        return {
          success: false,
          finalState: this.getState(),
          steps,
          lastAction,
        };
      }

      if (result.action !== undefined && result.agent !== undefined) {
        lastAction = { agent: result.agent, action: result.action };
      }
    }

    return {
      success: isGoalSatisfied(this._state, QUALITY_GATE_GOAL),
      finalState: this.getState(),
      steps,
      lastAction,
    };
  }

  /**
   * Get execution plan without executing
   */
  getExecutionPlan(): {
    steps: Array<{
      agent: string;
      action: QualityGateAction;
      dependencies: string[];
    }>;
    totalCost: number;
    estimatedDuration: number;
  } {
    const plan: Array<{
      agent: string;
      action: QualityGateAction;
      dependencies: string[];
    }> = [];
    let totalCost = 0;
    let estimatedDuration = 0;

    let tempState = this._state;

    while (!isGoalSatisfied(tempState, QUALITY_GATE_GOAL)) {
      const nextAgent = this.coordinator.determineNextAgent(tempState);

      if (!nextAgent) {
        break;
      }

      plan.push(nextAgent);
      totalCost += nextAgent.action.cost;
      estimatedDuration += nextAgent.action.duration ?? 1;

      // Apply action to get next state
      tempState = executeAction(tempState, nextAgent.action);
    }

    return { steps: plan, totalCost, estimatedDuration };
  }
}
