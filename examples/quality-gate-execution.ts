/**
 * Quality Gate GOAP System - Execution Example
 *
 * This file demonstrates how to use the GOAP system to execute
 * quality gate fixes in the dermatology orchestrator codebase.
 */

import {
  type QualityGateWorldState,
  type QualityGateAction,
  createInitialQualityGateState,
  QualityGateCoordinationProtocol,
  executeAction,
  isGoalSatisfied,
  QUALITY_GATE_GOAL,
} from '../services/quality-gate-goap';

// ============================================================================
// EXECUTION ENGINE
// ============================================================================

/**
 * Main execution engine for the quality gate GOAP system
 */
export class QualityGateGoapEngine {
  private coordinator: QualityGateCoordinationProtocol;
  private _state: QualityGateWorldState;
  private onStateChange?: (_state: QualityGateWorldState) => void;
  private onAgentExecute?: (_agent: string, _action: QualityGateAction) => void;
  private onError?: (_error: Error, _context: string) => void;

  constructor(options?: {
    onStateChange?: (_state: QualityGateWorldState) => void;
    onAgentExecute?: (_agent: string, _action: QualityGateAction) => void;
    onError?: (_error: Error, _context: string) => void;
  }) {
    this.coordinator = new QualityGateCoordinationProtocol();
    this._state = createInitialQualityGateState();
    this.onStateChange = options?.onStateChange;
    this.onAgentExecute = options?.onAgentExecute;
    this.onError = options?.onError;
  }

  /**
   * Get current world _state
   */
  getState(): QualityGateWorldState {
    return { ...this._state };
  }

  /**
   * Execute one _action step
   */
  async executeStep(): Promise<{
    success: boolean;
    _action?: QualityGateAction;
    _agent?: string;
    _error?: Error;
  }> {
    try {
      // Determine next _agent and _action
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
    } catch (_error) {
      this.onError?.(_error as Error, 'executeStep');
      return {
        success: false,
        _error: _error as Error,
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
        if (result._error) {
          errors.push(result._error);
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
    lastAction?: { agent: string; action: QualityGateAction };
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

      if (result.action && result.agent) {
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
      estimatedDuration += nextAgent.action.duration || 1;

      // Apply action to get next state
      tempState = executeAction(tempState, nextAgent.action);
    }

    return { steps: plan, totalCost, estimatedDuration };
  }
}

// ============================================================================
// MONITORING AND OBSERVABILITY
// ============================================================================

/**
 * Quality gate execution monitor
 */
export class QualityGateMonitor {
  private _state: QualityGateWorldState;
  private history: Array<{
    timestamp: number;
    event: string;
    data: Record<string, unknown>;
  }> = [];

  constructor(initialState: QualityGateWorldState) {
    this._state = initialState;
  }

  /**
   * Log _state change
   */
  logStateChange(oldState: QualityGateWorldState, newState: QualityGateWorldState): void {
    this._state = newState;

    const changes = this.detectChanges(oldState, newState);

    this.history.push({
      timestamp: Date.now(),
      event: 'state_change',
      data: { changes },
    });

    // Keep only last 100 events
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
  }

  /**
   * Log agent execution
   */
  logAgentExecution(agent: string, action: QualityGateAction): void {
    this.history.push({
      timestamp: Date.now(),
      event: 'agent_execution',
      data: { agent, action: action.name, cost: action.cost },
    });
  }

  /**
   * Log error
   */
  logError(error: Error, context: string): void {
    this.history.push({
      timestamp: Date.now(),
      event: 'error',
      data: { message: error.message, context, stack: error.stack },
    });
  }

  /**
   * Get execution progress
   */
  getProgress(): {
    completed: number;
    total: number;
    percentage: number;
    currentPhase: string;
    estimatedTimeRemaining: number;
  } {
    const phases = [
      { key: 'eslint_config_fixed', name: 'ESLint Config' },
      { key: 'test_files_refactored', name: 'Test Refactor' },
      { key: 'husky_hook_working', name: 'Husky Hook' },
      { key: 'ci_passing', name: 'CI Systems' },
      { key: 'quality_gates_clear', name: 'Quality Gates' },
    ];

    let completed = 0;
    let currentPhase = 'Not Started';

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i]!;
      if ((this._state as Record<string, boolean>)[phase.key]) {
        completed++;
      } else {
        currentPhase = phase.name;
        break;
      }
    }

    const total = phases.length;
    const percentage = (completed / total) * 100;

    // Estimate remaining time based on average _action cost and attempt count
    const avgCostPerPhase = 2.5;
    const remainingCost = (total - completed) * avgCostPerPhase;
    const estimatedTimeRemaining = remainingCost * 1000; // Assume 1s per cost unit

    return {
      completed,
      total,
      percentage,
      currentPhase,
      estimatedTimeRemaining,
    };
  }

  /**
   * Get execution history
   */
  getHistory(): typeof this.history {
    return [...this.history];
  }

  /**
   * Detect changes between states
   */
  private detectChanges(
    oldState: QualityGateWorldState,
    newState: QualityGateWorldState,
  ): Record<string, unknown> {
    const changes: Record<string, unknown> = {};

    // Check top-level boolean flags
    const flags = [
      'eslint_config_fixed',
      'test_files_refactored',
      'husky_hook_working',
      'ci_passing',
      'quality_gates_clear',
    ];

    flags.forEach((flag) => {
      const oldValue = (oldState as Record<string, boolean | undefined>)[flag];
      const newValue = (newState as Record<string, boolean | undefined>)[flag];
      if (oldValue !== newValue) {
        changes[flag] = {
          from: oldValue,
          to: newValue,
        };
      }
    });

    // Check nested objects for changes
    const nestedObjects = ['eslint_config', 'test_files', 'husky_hook', 'ci_systems'];

    nestedObjects.forEach((obj) => {
      const oldObj = (oldState as Record<string, unknown>)[obj];
      const newObj = (newState as Record<string, unknown>)[obj];

      if (
        oldObj !== undefined &&
        newObj !== undefined &&
        JSON.stringify(oldObj) !== JSON.stringify(newObj)
      ) {
        changes[obj] = { from: oldObj, to: newObj };
      }
    });

    return changes;
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example: Basic execution with logging
 */
export async function exampleBasicExecution(): Promise<void> {
  console.log('🚀 Starting Quality Gate GOAP Execution...');

  const monitor = new QualityGateMonitor(createInitialQualityGateState());

  const engine = new QualityGateGoapEngine({
    onStateChange: (_state) => {
      monitor.logStateChange(engine.getState(), _state);
      console.log('📊 Progress:', monitor.getProgress());
    },
    onAgentExecute: (_agent, _action) => {
      monitor.logAgentExecution(_agent, _action);
      console.log(`🔧 Executing: ${_agent} -> ${_action.name}`);
    },
    onError: (_error, _context) => {
      monitor.logError(_error, _context);
      console.error(`❌ Error in ${_context}:`, _error.message);
    },
  });

  const result = await engine.executeAll();

  console.log('\n📈 Execution Summary:');
  console.log(`Success: ${result.success}`);
  console.log(`Steps: ${result.steps}`);
  console.log(`Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    result.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error.message}`);
    });
  }

  const progress = monitor.getProgress();
  console.log(`\n🎯 Final Progress: ${progress.percentage.toFixed(1)}% complete`);
  console.log(`   Current Phase: ${progress.currentPhase}`);
}

/**
 * Example: Step-by-step execution with manual control
 */
export async function exampleStepByStepExecution(): Promise<void> {
  console.log('🔍 Step-by-step Quality Gate Execution...\n');

  const engine = new QualityGateGoapEngine();
  let stepCount = 0;

  while (stepCount < 10) {
    stepCount++;

    const plan = engine.getExecutionPlan();
    console.log(`\n--- Step ${stepCount} ---`);
    console.log(`Plan: ${plan.steps.length} actions remaining`);
    console.log(`Total cost: ${plan.totalCost}`);

    if (plan.steps.length === 0) {
      console.log('✅ No more actions needed');
      break;
    }

    const nextStep = plan.steps[0];
    if (nextStep) {
      console.log(`Next: ${nextStep.agent} -> ${nextStep.action.name}`);
    }

    // Execute one step
    const result = await this.executeStep();

    if (!result.success) {
      console.log(`❌ Step failed: ${result.error?.message}`);
      break;
    }

    console.log(`✅ Step completed: ${result.action?.name}`);

    // Check if goal is reached
    const _state = engine.getState();
    if (_state.quality_gates_clear) {
      console.log('🎉 Goal reached! All quality gates fixed.');
      break;
    }
  }
}

/**
 * Example: Planning without execution
 */
export function examplePlanningOnly(): void {
  console.log('📋 Quality Gate Execution Plan...\n');

  const engine = new QualityGateGoapEngine();
  const plan = engine.getExecutionPlan();

  console.log(`Total Actions: ${plan.steps.length}`);
  console.log(`Total Cost: ${plan.totalCost}`);
  console.log(`Estimated Duration: ${plan.estimatedDuration}ms\n`);

  console.log('Execution Sequence:');
  plan.steps.forEach((step, index) => {
    console.log(`${index + 1}. ${step.agent} -> ${step.action.name} (cost: ${step.action.cost})`);
    console.log(`   Dependencies: ${step.dependencies?.join(', ') || 'none'}`);
    console.log('');
  });
}

/**
 * Example: Error handling and recovery
 */
export async function exampleErrorHandling(): Promise<void> {
  console.log('🛡️ Error Handling Example...\n');

  const monitor = new QualityGateMonitor(createInitialQualityGateState());

  const engine = new QualityGateGoapEngine({
    onError: (_error, _context) => {
      monitor.logError(_error, _context);
      console.log(`🔧 Attempting recovery from _error in ${_context}...`);

      // Example recovery logic
      if (_error.message.includes('Preconditions not met')) {
        console.log('⚠️  Precondition failure - skipping to next available _action');
      } else {
        console.log('❌ Unrecoverable _error - stopping execution');
      }
    },
  });

  const result = await engine.executeUntilFailure();

  console.log('\n📊 Error Handling Results:');
  console.log(`Completed Steps: ${result.steps}`);
  console.log(`Success: ${result.success}`);

  if (result.lastAction) {
    console.log(`Last Executed: ${result.lastAction._agent} -> ${result.lastAction._action.name}`);
  }

  const history = monitor.getHistory();
  const errors = history.filter((e) => e.event === '_error');
  console.log(`Errors Logged: ${errors.length}`);
}

/**
 * Example: Custom execution with specific goals
 */
export async function exampleCustomExecution(): Promise<void> {
  console.log('🎯 Custom Goal Execution...\n');

  const engine = new QualityGateGoapEngine({
    onStateChange: (_state) => {
      if (_state.eslint_config_fixed) {
        console.log('✅ ESLint config is now fixed - stopping execution');
        // In a real implementation, you'd want to stop the engine here
      }
    },
  });

  // Get and display initial plan
  const plan = engine.getExecutionPlan();
  console.log('Initial plan for ESLint config fix:');
  plan.steps.slice(0, 2).forEach((step, index) => {
    console.log(`${index + 1}. ${step._action.name} (${step._agent})`);
  });

  // Execute until ESLint is fixed or max steps
  let steps = 0;
  while (steps < 5 && !engine.getState().eslint_config_fixed) {
    steps++;
    const result = await engine.executeStep();

    if (!result.success) {
      console.log(`❌ Step ${steps} failed: ${result._error?.message}`);
      break;
    }

    console.log(`✅ Step ${steps}: ${result._action?.name}`);
  }

  const finalState = engine.getState();
  console.log(`\nFinal State - ESLint Fixed: ${finalState.eslint_config_fixed}`);
  console.log(`Attempts Made: ${finalState.current_attempt}`);
}
