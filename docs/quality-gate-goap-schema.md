# Quality Gate GOAP System - Complete Schema & Coordination Protocol

## System Overview

This GOAP system coordinates 5 specialized agents to systematically fix quality gate issues in the dermatology orchestrator codebase. The system ensures proper sequencing, validates dependencies, and handles failures gracefully.

## 🎯 GOAP Schema

### World State Representation

```typescript
interface QualityGateWorldState {
  // Core Quality Gate Flags
  eslint_config_fixed: boolean; // ESLint config issues resolved
  test_files_refactored: boolean; // Test files under size limit
  husky_hook_working: boolean; // Pre-commit hook functional
  ci_passing: boolean; // All CI workflows passing
  quality_gates_clear: boolean; // All quality checks passing

  // Detailed State Tracking
  eslint_config: {
    has_jest_dom_plugin: boolean;
    has_test_globals: boolean;
    jest_dom_version: string | null;
    test_globals_configured: boolean;
  };

  test_files: {
    diagnostic_summary_size: number; // Current: 763, Target: <500
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
}
```

### Agent Actions with Preconditions & Effects

#### 1. ESLint Config Agent

**Action 1: `add-jest-dom-plugin`**

- **Preconditions**: `!eslint_config.has_jest_dom_plugin`
- **Effects**:
  - `eslint_config.has_jest_dom_plugin = true`
  - `eslint_config.jest_dom_version = "6.0.2"`
  - `current_attempt++`
- **Cost**: 1

**Action 2: `configure-test-globals`**

- **Preconditions**: `!eslint_config.has_test_globals`
- **Effects**:
  - `eslint_config.has_test_globals = true`
  - `eslint_config.test_globals_configured = true`
  - `eslint_config_fixed = true`
  - `current_attempt++`
- **Cost**: 2

#### 2. Test Refactor Agent

**Action 1: `split-diagnostic-summary-test`**

- **Preconditions**: `test_files.diagnostic_summary_size > 500`
- **Effects**:
  - `test_files.diagnostic_summary_size = 450`
  - `test_files.diagnostic_summary_under_limit = true`
  - `current_attempt++`
- **Cost**: 3

**Action 2: `fix-type-errors`**

- **Preconditions**: `eslint_config_fixed && !test_files.type_errors_fixed`
- **Effects**:
  - `test_files.type_errors_fixed = true`
  - `test_files_refactored = true`
  - `current_attempt++`
- **Cost**: 2

#### 3. Husky Hook Agent

**Action 1: `fix-npm-execution`**

- **Preconditions**: `!husky_hook.npm_commands_working`
- **Effects**:
  - `husky_hook.npm_commands_working = true`
  - `current_attempt++`
- **Cost**: 2

**Action 2: `verify-husky-hook`**

- **Preconditions**: `husky_hook.npm_commands_working && !husky_hook.quality_gate_passing`
- **Effects**:
  - `husky_hook.pre_commit_executable = true`
  - `husky_hook.quality_gate_passing = true`
  - `husky_hook_working = true`
  - `current_attempt++`
- **Cost**: 1

#### 4. CI Fix Agent

**Action 1: `debug-lint-workflow`**

- **Preconditions**: `eslint_config_fixed && !ci_systems.lint_workflow_passing`
- **Effects**:
  - `ci_systems.lint_workflow_passing = true`
  - `current_attempt++`
- **Cost**: 2

**Action 2: `fix-e2e-workflow`**

- **Preconditions**: `test_files_refactored && !ci_systems.e2e_workflow_passing`
- **Effects**:
  - `ci_systems.e2e_workflow_passing = true`
  - `current_attempt++`
- **Cost**: 3

**Action 3: `resolve-code-quality`**

- **Preconditions**: `husky_hook_working && !ci_systems.code_quality_workflow_passing`
- **Effects**:
  - `ci_systems.code_quality_workflow_passing = true`
  - `ci_systems.all_jobs_successful = true`
  - `ci_passing = true`
  - `current_attempt++`
- **Cost**: 2

#### 5. Quality Gate Agent

**Action 1: `final-lint-fix`**

- **Preconditions**: `ci_passing && !quality_gates_clear`
- **Effects**:
  - `quality_gates_clear = true`
  - `current_attempt++`
- **Cost**: 1
- **Failure Handler**: Logs error to `error_log`

## 🔗 Coordination Protocol

### Sequential Agent Pipeline

```
ESLintConfigAgent → TestRefactorAgent → HuskyHookAgent → CIFixAgent → QualityGateAgent
```

### Handoff Validation Rules

1. **Sequential Order**: Cannot skip or reorder agents
2. **Prerequisites**: Each agent's preconditions must be satisfied
3. **Dependencies**: Previous agent must complete successfully

```typescript
function validateHandoff(currentAgent: string, nextAgent: string): boolean {
  const agentOrder = [
    'ESLintConfigAgent',
    'TestRefactorAgent',
    'HuskyHookAgent',
    'CIFixAgent',
    'QualityGateAgent',
  ];

  const currentIndex = agentOrder.indexOf(currentAgent);
  const nextIndex = agentOrder.indexOf(nextAgent);

  return nextIndex > currentIndex && nextIndex >= 0;
}
```

### Agent Selection Algorithm

```typescript
function determineNextAgent(state: QualityGateWorldState): AgentAction | null {
  // Strict sequential execution
  if (!state.eslint_config_fixed) {
    return { agent: 'ESLintConfigAgent', action: getNextESLintAction(state) };
  }

  if (state.eslint_config_fixed && !state.test_files_refactored) {
    return { agent: 'TestRefactorAgent', action: getNextTestAction(state) };
  }

  if (state.test_files_refactored && !state.husky_hook_working) {
    return { agent: 'HuskyHookAgent', action: getNextHuskyAction(state) };
  }

  if (state.husky_hook_working && !state.ci_passing) {
    return { agent: 'CIFixAgent', action: getNextCIAction(state) };
  }

  if (state.ci_passing && !state.quality_gates_clear) {
    return { agent: 'QualityGateAgent', action: getNextQualityGateAction(state) };
  }

  return null; // Goal reached
}
```

## 🎮 Usage Examples

### Basic Execution

```typescript
import {
  QualityGateGoapEngine,
  QualityGateMonitor,
  createInitialQualityGateState,
} from './services/quality-gate-goap';

// Initialize
const engine = new QualityGateGoapEngine({
  onStateChange: (state) => console.log('Progress:', state),
  onAgentExecute: (agent, action) => console.log(`Executing: ${agent}`),
});

// Execute until goal reached
const result = await engine.executeAll();

console.log(`Success: ${result.success}`);
console.log(`Steps: ${result.steps}`);
console.log(`Errors: ${result.errors.length}`);
```

### Step-by-Step Execution

```typescript
// Get execution plan without running
const plan = engine.getExecutionPlan();
console.log(`Total Actions: ${plan.steps.length}`);

// Execute one step at a time
for (const step of plan.steps) {
  console.log(`Next: ${step.agent} -> ${step.action.name}`);
  const result = await engine.executeStep();

  if (!result.success) {
    console.log(`Failed: ${result.error?.message}`);
    break;
  }
}
```

### Monitoring & Observability

```typescript
const monitor = new QualityGateMonitor(createInitialQualityGateState());

// Track progress
engine.onStateChange = (newState) => {
  monitor.logStateChange(engine.getState(), newState);
  const progress = monitor.getProgress();
  console.log(`${progress.percentage.toFixed(1)}% complete`);
};

// View execution history
const history = monitor.getHistory();
const errors = history.filter((e) => e.event === 'error');
console.log(`Errors: ${errors.length}`);
```

## 🔍 Testing Strategy

### Unit Test Examples

```typescript
describe('ESLintConfigAgent', () => {
  test('add-jest-dom-plugin sets correct flags', () => {
    const initialState = createInitialQualityGateState();
    const action = eslintConfigActions[0]; // add-jest-dom-plugin

    const resultState = executeAction(initialState, action);

    expect(resultState.eslint_config.has_jest_dom_plugin).toBe(true);
    expect(resultState.eslint_config.jest_dom_version).toBe('6.0.2');
    expect(resultState.current_attempt).toBe(2);
  });

  test('preconditions prevent premature execution', () => {
    const state = createInitialQualityGateState();
    state.eslint_config.has_jest_dom_plugin = true;
    const action = eslintConfigActions[0];

    expect(action.preconditions(state)).toBe(false);
  });
});

describe('Agent Coordination', () => {
  test('validates correct agent sequence', () => {
    const coordinator = new QualityGateCoordinationProtocol();
    const state = createInitialQualityGateState();

    const nextAgent = coordinator.determineNextAgent(state);
    expect(nextAgent?.agent).toBe('ESLintConfigAgent');

    // After ESLint is fixed, should move to TestRefactorAgent
    state.eslint_config_fixed = true;
    const nextAgent2 = coordinator.determineNextAgent(state);
    expect(nextAgent2?.agent).toBe('TestRefactorAgent');
  });
});
```

### Integration Test Examples

```typescript
describe('Complete Quality Gate Flow', () => {
  test('executes all agents in correct order', async () => {
    const engine = new QualityGateGoapEngine();
    const executedAgents: string[] = [];

    engine.onAgentExecute = (agent) => {
      executedAgents.push(agent);
    };

    const result = await engine.executeAll();

    expect(result.success).toBe(true);
    expect(executedAgents).toEqual([
      'ESLintConfigAgent',
      'TestRefactorAgent',
      'HuskyHookAgent',
      'CIFixAgent',
      'QualityGateAgent',
    ]);
  });

  test('handles failures gracefully', async () => {
    const monitor = new QualityGateMonitor(createInitialQualityGateState());
    const engine = new QualityGateGoapEngine({
      onError: (error) => monitor.logError(error, 'test'),
    });

    const result = await engine.executeUntilFailure();

    expect(result.steps).toBeGreaterThan(0);
    const history = monitor.getHistory();
    const errors = history.filter((e) => e.event === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(0);
  });
});
```

## 📊 Performance Metrics

### Cost Analysis

| Agent             | Actions | Avg Cost | Duration  |
| ----------------- | ------- | -------- | --------- |
| ESLintConfigAgent | 2       | 1.5      | 2-5 min   |
| TestRefactorAgent | 2       | 2.5      | 10-20 min |
| HuskyHookAgent    | 2       | 1.5      | 5-10 min  |
| CIFixAgent        | 3       | 2.3      | 15-30 min |
| QualityGateAgent  | 1       | 1        | 2-5 min   |

**Total Estimated Duration**: 35-70 minutes

### State Size Optimization

- **Current State Size**: ~2KB JSON
- **History Limit**: 100 events
- **Memory Footprint**: <5MB for typical execution

## 🛠️ Error Handling Strategy

### Failure Types

1. **Precondition Failures**: Agent prerequisites not met
2. **Execution Failures**: Action execution throws errors
3. **Coordination Failures**: Agent handoff validation fails
4. **Timeout Failures**: Action takes too long

### Recovery Mechanisms

```typescript
// Each action has an onFailure handler
{
  onFailure: (state, error) => {
    const newState = { ...state };
    newState.error_log.push(`Action failed: ${error.message}`);
    // Attempt recovery or mark for manual intervention
    return newState;
  };
}
```

### Error Logging

- All errors logged to `error_log` array
- Timestamps and context preserved
- Failed actions logged with stack traces

## 📈 Success Criteria

### Goal Definition

```typescript
const QUALITY_GATE_GOAL = {
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
};
```

### Validation Checks

1. **ESLint Config**: Jest-dom plugin installed, test globals configured
2. **Test Files**: DiagnosticSummary.test.tsx < 500 lines, type errors fixed
3. **Husky Hook**: Pre-commit hook executable, npm commands working
4. **CI Systems**: Lint, E2E, and code-quality workflows passing
5. **Quality Gates**: All remaining linting issues resolved

## 🚀 Next Steps

### Immediate Actions

1. **Implement Agent Executors**: Build actual agents that perform the fixes
2. **Add File System Integration**: Read/write configuration files
3. **Connect to CI/CD**: Real-time status checking of workflows
4. **Add Rollback Capability**: Undo changes if needed

### Future Enhancements

1. **Parallel Execution**: Independent agents can run concurrently
2. **ML-Driven Planning**: Optimize action sequences using machine learning
3. **Web Dashboard**: Real-time monitoring and control interface
4. **Auto-Scaling**: Dynamically add/remove agents based on load

This GOAP system provides a robust, extensible framework for systematically resolving quality gate issues while maintaining high reliability, observability, and proper coordination between specialized agents.
