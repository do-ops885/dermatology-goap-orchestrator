/**
 * Quality Gate Execution Monitor
 *
 * Monitoring and observability for quality gate GOAP execution
 */

import type { QualityGateWorldState, QualityGateAction } from '../quality-gate-goap';

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
   * Log state change
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
      { key: 'eslint_passing', name: 'ESLint' },
      { key: 'formatting_passing', name: 'Formatting' },
      { key: 'unit_tests_passing', name: 'Unit Tests' },
      { key: 'e2e_tests_passing', name: 'E2E Tests' },
      { key: 'sonarcloud_passing', name: 'SonarCloud' },
      { key: 'code_complexity_passing', name: 'Code Complexity' },
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

    // Estimate remaining time based on average action cost and attempt count
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

    // Check core flags
    const flags = [
      'eslint_passing',
      'formatting_passing',
      'unit_tests_passing',
      'e2e_tests_passing',
      'sonarcloud_passing',
      'code_complexity_passing',
      'all_ci_checks_passing',
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
    const nestedObjects = [
      'eslint_status',
      'formatting_status',
      'unit_tests_status',
      'e2e_tests_status',
      'sonarcloud_status',
      'code_complexity_status',
    ];

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
