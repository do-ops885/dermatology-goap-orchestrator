# AgentDB Integration Analysis

## Current Usage

AgentDB is used for vector storage and case similarity search in the clinical pipeline:

| Agent                   | Purpose                                 |
| ----------------------- | --------------------------------------- |
| Similarity-Search-Agent | RAG: 10 similar cases from vector store |
| Fairness-Audit-Agent    | TPR validation across demographics      |
| Learning-Agent          | Vector store update with new patterns   |
| Audit-Trail-Agent       | Transaction hash to immutable ledger    |

## Integration Points

### Service Layer

- `services/agentDB.ts` - Singleton `ClinicalAgentDB` class wrapping AgentDB library
- Uses `ReasoningBank`, `createDatabase`, `EmbeddingService` from `agentdb` package

### Test Setup

- Tests mock `AgentDB.getInstance()` completely via `mockAgentDBSpy()` helper
- No actual AgentDB connection needed in test environment
- Mock located in `tests/components/DiagnosticSummary.setup.ts`

## Issues Identified

### 1. Permission Issue

**Problem:** AgentDB CLI script lacks executable permission after `npm install`

**Evidence:**

```
sh: 1: agentdb: Permission denied
```

**Root Cause:** The symlink in `node_modules/.bin/agentdb` points to `../agentdb/dist/src/cli/agentdb-cli.js` which doesn't have the executable bit set after npm install.

### 2. CI Workflow Workaround

The `.github/workflows/ci.yml` uses `continue-on-error: true` to handle the failed AgentDB initialization.

## Fixes Applied

### 1. CI Workflow Fix

Added explicit permission fix in CI workflow:

```yaml
- name: Fix AgentDB executable permissions
  run: chmod +x node_modules/agentdb/dist/src/cli/agentdb-cli.js
```

### 2. Test Setup Enhancement

Added automatic permission fix in test setup to handle local development environments.

## Recommendations for CI/CD

### Short-term

1. Keep the `continue-on-error: true` setting for `npx agentdb init` as a safety net
2. The explicit chmod fix ensures AgentDB init will succeed in most cases

### Long-term

1. Consider if AgentDB initialization is actually needed for CI tests
   - Tests mock AgentDB completely
   - AgentDB init creates a local `agentdb.db` file that may not be needed
2. Consider removing AgentDB init step from CI if tests continue to pass without it
3. Add environment variable to optionally skip AgentDB init when not needed

### Local Development

- Run `npm run agentdb:init` once to initialize the database
- If permission errors occur, run: `chmod +x node_modules/agentdb/dist/src/cli/agentdb-cli.js`

## Test Coverage

AgentDB is well-tested via mocks:

- `tests/unit/agentDB.test.ts` - Unit tests for AgentDB service
- `tests/components/DiagnosticSummary.*.test.tsx` - Component tests using mocked AgentDB
- `tests/components/FairnessDashboard.test.tsx` - Fairness metrics tests

All tests use `mockAgentDBSpy()` which provides a complete mock, eliminating the need for actual AgentDB initialization in test environments.
