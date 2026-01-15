/**
 * Quality Gate GOAP System - Execution Example
 *
 * This file demonstrates how to use the GOAP system to execute
 * quality gate fixes in the dermatology orchestrator codebase.
 */

import { QualityGateGoapEngine } from '../services/executors/quality-gate-engine';
import { QualityGateMonitor } from '../services/executors/quality-gate-monitor';
import { createInitialQualityGateState } from '../services/quality-gate-goap';

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
    onStateChange: (state) => {
      monitor.logStateChange(engine.getState(), state);
      console.log('📊 Progress:', monitor.getProgress());
    },
    onAgentExecute: (agent, action) => {
      monitor.logAgentExecution(agent, action);
      console.log(`🔧 Executing: ${agent} -> ${action.name}`);
    },
    onError: (error, context) => {
      monitor.logError(error, context);
      console.error(`❌ Error in ${context}:`, error.message);
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
    const result = await engine.executeStep();

    if (!result.success) {
      console.log(`❌ Step failed: ${result.error?.message}`);
      break;
    }

    console.log(`✅ Step completed: ${result.action?.name}`);

    // Check if goal is reached
    const state = engine.getState();
    if (state.all_ci_checks_passing) {
      console.log('🎉 Goal reached! All CI checks passing.');
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
    onError: (error, context) => {
      monitor.logError(error, context);
      console.log(`🔧 Attempting recovery from error in ${context}...`);

      // Example recovery logic
      if (error.message.includes('Preconditions not met')) {
        console.log('⚠️  Precondition failure - skipping to next available action');
      } else {
        console.log('❌ Unrecoverable error - stopping execution');
      }
    },
  });

  const result = await engine.executeUntilFailure();

  console.log('\n📊 Error Handling Results:');
  console.log(`Completed Steps: ${result.steps}`);
  console.log(`Success: ${result.success}`);

  if (result.lastAction) {
    console.log(`Last Executed: ${result.lastAction.agent} -> ${result.lastAction.action.name}`);
  }

  const history = monitor.getHistory();
  const errors = history.filter((e) => e.event === 'error');
  console.log(`Errors Logged: ${errors.length}`);
}

/**
 * Example: Custom execution with specific goals
 */
export async function exampleCustomExecution(): Promise<void> {
  console.log('🎯 Custom Goal Execution...\n');

  const engine = new QualityGateGoapEngine({
    onStateChange: (state) => {
      if (state.eslint_passing) {
        console.log('✅ ESLint is now passing - stopping execution');
        // In a real implementation, you'd want to stop the engine here
      }
    },
  });

  // Get and display initial plan
  const plan = engine.getExecutionPlan();
  console.log('Initial plan for ESLint fix:');
  plan.steps.slice(0, 2).forEach((step, index) => {
    console.log(`${index + 1}. ${step.action.name} (${step.agent})`);
  });

  // Execute until ESLint is fixed or max steps
  let steps = 0;
  while (steps < 5 && !engine.getState().eslint_passing) {
    steps++;
    const result = await engine.executeStep();

    if (!result.success) {
      console.log(`❌ Step ${steps} failed: ${result.error?.message}`);
      break;
    }

    console.log(`✅ Step ${steps}: ${result.action?.name}`);
  }

  const finalState = engine.getState();
  console.log(`\nFinal State - ESLint Passing: ${finalState.eslint_passing}`);
  console.log(`Attempts Made: ${finalState.current_attempt}`);
}
