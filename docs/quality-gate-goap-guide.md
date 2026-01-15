# Quality Gate GOAP System - Implementation Guide

## Overview

This document provides a comprehensive implementation guide for the GOAP system designed to fix quality gate issues in the dermatology orchestrator codebase. The system coordinates 5 specialized agents working in sequence to resolve CI/CD pipeline failures.

## System Architecture

### 1. Sequential Agent Pipeline

The agents work in a strict sequential order with hard dependencies:

```
ESLintConfigAgent → TestRefactorAgent → HuskyHookAgent → CIFixAgent → QualityGateAgent
```

### 2. World State Tracking

The system maintains a detailed `QualityGateWorldState` that tracks:

- **Core Quality Gate Flags**: Boolean flags for each major component
- **Detailed State Tracking**: Nested objects with granular status
- **Metadata**: Attempt counts, error logs, timestamps

### 3. Action Coordination

Each agent has multiple actions with specific:

- **Preconditions**: What must be true before execution
- **Effects**: State changes after successful execution
- **Costs**: Relative execution complexity
- **Failure Handlers**: How to handle execution errors

## Agent Specifications

### ESLint Config Agent

**Purpose**: Fix eslint.config.js by adding missing jest-dom plugin and test globals

**Actions**:

1. `add-jest-dom-plugin` - Install and configure jest-dom plugin
2. `configure-test-globals` - Add test environment globals

**Preconditions**:

- ESLint config doesn't have jest-dom plugin
- Test globals not configured

**Expected Effects**:

- `eslint_config.has_jest_dom_plugin = true`
- `eslint_config.has_test_globals = true`
- `eslint_config_fixed = true`

### Test Refactor Agent

**Purpose**: Split DiagnosticSummary.test.tsx (763 lines → <500) and fix type issues

**Actions**:

1. `split-diagnostic-summary-test` - Refactor large test file into smaller modules
2. `fix-type-errors` - Resolve TypeScript compilation errors

**Preconditions**:

- ESLint config must be fixed first
- Test file exceeds 500 lines
- Type errors exist

**Expected Effects**:

- `test_files.diagnostic_summary_size < 500`
- `test_files.type_errors_fixed = true`
- `test_files_refactored = true`

### Husky Hook Agent

**Purpose**: Fix pre-commit hook npm execution failures

**Actions**:

1. `fix-npm-execution` - Resolve npm command path issues
2. `verify-husky-hook` - Ensure hook executes successfully

**Preconditions**:

- Tests must be refactored first
- npm commands not working in hooks

**Expected Effects**:

- `husky_hook.npm_commands_working = true`
- `husky_hook.quality_gate_passing = true`
- `husky_hook_working = true`

### CI Fix Agent

**Purpose**: Debug and resolve GitHub Actions failures (lint, e2e, code-quality)

**Actions**:

1. `debug-lint-workflow` - Fix ESLint GitHub Action
2. `fix-e2e-workflow` - Resolve Playwright E2E test failures
3. `resolve-code-quality` - Fix code quality workflow issues

**Preconditions**:

- Husky hook must be working first
- Each workflow has specific prerequisites

**Expected Effects**:

- `ci_systems.lint_workflow_passing = true`
- `ci_systems.e2e_workflow_passing = true`
- `ci_systems.code_quality_workflow_passing = true`
- `ci_passing = true`

### Quality Gate Agent

**Purpose**: Fix remaining linting issues and ensure all checks pass

**Actions**:

1. `final-lint-fix` - Apply final cleanup and validation

**Preconditions**:

- CI must be passing first
- Some remaining linting issues exist

**Expected Effects**:

- `quality_gates_clear = true`

## Coordination Protocol

### Agent Handoff Validation

The system validates each handoff to ensure:

1. **Sequential Order**: Cannot skip or reorder agents
2. **Prerequisites Met**: Each agent's preconditions must be satisfied
3. **Dependencies Clear**: Previous agent must complete successfully

### Error Handling

Each action includes:

- **Execution Guards**: Try-catch around action effects
- **State Logging**: Errors added to `error_log` array
- **Failure Recovery**: `onFailure` handlers for graceful degradation
- **Attempt Tracking**: `current_attempt` incremented per action

### State Mutation Rules

1. **Immutable Updates**: All state changes create new objects
2. **Timestamp Updates**: Every mutation updates `timestamp`
3. **Agent Tracking**: `last_agent_executed` records current agent
4. **Error Accumulation**: All errors logged for debugging

## Implementation Patterns

### 1. Action Definition Pattern

```typescript
{
  name: 'action-name',
  agent: 'AgentName',
  preconditions: (state) => !state.someFlag,
  effects: (state) => {
    const newState = { ...state };
    newState.someFlag = true;
    newState.current_attempt++;
    return newState;
  },
  cost: 2,
  onFailure: (state, error) => {
    const newState = { ...state };
    newState.error_log.push(`Action failed: ${error.message}`);
    return newState;
  }
}
```

### 2. State Transition Pattern

```typescript
// Check preconditions
if (!action.preconditions(currentState)) {
  throw new Error('Preconditions not met');
}

// Execute action
const newState = action.effects(currentState);

// Log transition
console.log(`Executed ${action.name}:`, {
  from: currentState.someFlag,
  to: newState.someFlag,
});

return newState;
```

### 3. Agent Selection Pattern

```typescript
// Determine next agent based on current state
if (!state.eslint_config_fixed) {
  return selectNextAction(eslintConfigActions, state);
}

if (state.eslint_config_fixed && !state.test_files_refactored) {
  return selectNextAction(testRefactorActions, state);
}

// ... continue for each agent
```

## Usage Examples

### Basic Execution Flow

```typescript
import {
  createInitialQualityGateState,
  QualityGateCoordinationProtocol,
  getAvailableActions,
  executeAction,
} from './services/quality-gate-goap';

// Initialize system
let state = createInitialQualityGateState();
const coordinator = new QualityGateCoordinationProtocol();

// Execute until goal reached
while (!state.quality_gates_clear) {
  const nextAgent = coordinator.determineNextAgent(state);

  if (!nextAgent) {
    console.log('No more actions available');
    break;
  }

  console.log(`Executing ${nextAgent.agent}: ${nextAgent.action.name}`);

  try {
    state = executeAction(state, nextAgent.action);
    console.log('Action completed successfully');
  } catch (error) {
    console.error(`Action failed: ${error.message}`);
    // System handles failure gracefully via onFailure handlers
  }
}
```

### State Monitoring

```typescript
// Check progress at any point
function printProgress(state: QualityGateWorldState) {
  console.log('=== Quality Gate Progress ===');
  console.log(`ESLint Config: ${state.eslint_config_fixed ? '✅' : '❌'}`);
  console.log(`Test Files: ${state.test_files_refactored ? '✅' : '❌'}`);
  console.log(`Husky Hook: ${state.husky_hook_working ? '✅' : '❌'}`);
  console.log(`CI Systems: ${state.ci_passing ? '✅' : '❌'}`);
  console.log(`Quality Gates: ${state.quality_gates_clear ? '✅' : '❌'}`);
  console.log(`Current Attempt: ${state.current_attempt}`);

  if (state.error_log.length > 0) {
    console.log('\nErrors:');
    state.error_log.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
  }
}
```

### Manual State Updates

```typescript
// For testing or manual intervention
function updateStateManually(
  state: QualityGateWorldState,
  updates: Partial<QualityGateWorldState>,
) {
  const newState = { ...state, ...updates };
  newState.timestamp = Date.now();
  return newState;
}

// Example: Mark ESLint as fixed manually
state = updateStateManually(state, {
  eslint_config_fixed: true,
  eslint_config: {
    ...state.eslint_config,
    has_jest_dom_plugin: true,
    has_test_globals: true,
  },
});
```

## Testing Strategy

### Unit Tests

1. **Action Preconditions**: Test each action's precondition logic
2. **State Transitions**: Verify state changes match expectations
3. **Error Handling**: Test failure scenarios and recovery
4. **Coordination Logic**: Validate agent handoff validation

### Integration Tests

1. **End-to-End Flow**: Test complete agent sequence
2. **State Persistence**: Verify state consistency across steps
3. **Error Recovery**: Test graceful handling of failures
4. **Performance**: Measure execution time and resource usage

### Example Test

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
    const action = eslintConfigActions[0]; // add-jest-dom-plugin

    expect(action.preconditions(state)).toBe(false);
  });
});
```

## Performance Considerations

### State Size Optimization

- Keep nested objects shallow where possible
- Use selective copying for large state sections
- Implement state compression for long-running sessions

### Action Cost Estimation

- Higher costs for actions involving file I/O
- Lower costs for configuration-only changes
- Consider parallel execution where dependencies allow

### Memory Management

- Implement state snapshots for rollback capability
- Clean up error logs periodically
- Monitor memory usage during long sequences

## Troubleshooting

### Common Issues

1. **Circular Dependencies**: Ensure strict sequential ordering
2. **State Inconsistency**: Validate state after each action
3. **Infinite Loops**: Check precondition logic for edge cases
4. **Performance Degradation**: Monitor action costs and timing

### Debug Mode

```typescript
const DEBUG = true;

function executeAction(
  state: QualityGateWorldState,
  action: QualityGateAction,
): QualityGateWorldState {
  if (DEBUG) {
    console.log(`Executing: ${action.name}`);
    console.log(`Preconditions met: ${action.preconditions(state)}`);
    console.log(`Current state:`, JSON.stringify(state, null, 2));
  }

  const newState = action.effects(state);

  if (DEBUG) {
    console.log(`New state:`, JSON.stringify(newState, null, 2));
    console.log(`Changes:`, JSON.stringify(diff(state, newState), null, 2));
  }

  return newState;
}
```

## Future Enhancements

### Potential Improvements

1. **Parallel Execution**: Allow independent agents to run concurrently
2. **Rollback Capability**: Implement undo functionality for failed actions
3. **State Persistence**: Save/restore state between sessions
4. **Dynamic Agent Loading**: Load agents based on current issues
5. **ML-Driven Planning**: Use machine learning to optimize action sequences

### Extension Points

1. **Custom Actions**: Add new actions for specific issues
2. **Custom Agents**: Implement new specialized agents
3. **Custom Goals**: Define additional goal types
4. **Custom Heuristics**: Implement domain-specific cost functions

## Conclusion

This GOAP system provides a robust, extensible framework for systematically fixing quality gate issues. The sequential coordination protocol ensures reliable execution while the detailed state tracking enables comprehensive monitoring and debugging.

The system's design prioritizes:

- **Reliability**: Strict validation and error handling
- **Observability**: Comprehensive state tracking and logging
- **Extensibility**: Easy addition of new agents and actions
- **Maintainability**: Clear separation of concerns and documentation

By following the patterns and protocols outlined in this guide, the system can effectively coordinate complex quality gate修复 workflows while maintaining high reliability and observability.
