# Code Refactoring Checklist - 500 LOC Violations

**Priority:** HIGH - Blocks SonarCloud Quality Gates

---

## Files Requiring Refactoring

### 1. services/agentDB.ts (524 lines)

**Current Issues:**

- Exceeds 500 LOC limit by 24 lines
- Likely mixing concerns: connection management, queries, utilities

**Proposed Structure:**

```
services/
  agentdb/
    core.ts              # Connection management, initialization
    operations.ts        # CRUD operations, queries
    helpers.ts           # Utility functions, formatters
    index.ts             # Public exports
```

**Estimated Effort:** 2-3 hours

---

### 2. services/quality-gate-goap.ts (562 lines)

**Current Issues:**

- Exceeds 500 LOC limit by 62 lines
- Mixing GOAP registry, executor implementations, and validation logic

**Proposed Structure:**

```
services/
  quality-gate/
    executors.ts          # Individual agent executors
    registry.ts           # GOAP action definitions
    validators.ts         # Quality gate validation logic
    index.ts              # Public exports
```

**Estimated Effort:** 3-4 hours

---

### 3. hooks/useClinicalAnalysis.ts (519 lines)

**Current Issues:**

- Exceeds 500 LOC limit by 19 lines
- Mixing agent orchestration, state management, and UI logic

**Proposed Structure:**

```
hooks/
  useClinicalAnalysis/
    main.ts              # Main hook export
    agents.ts             # Agent orchestration functions
    state.ts              # State management helpers
    validators.ts         # Validation logic
    index.ts              # Public exports
```

**Alternative:** Create focused sub-hooks

```
hooks/
  useImageVerification.ts
  useSkinToneDetection.ts
  useLesionDetection.ts
  useRiskAssessment.ts
```

**Estimated Effort:** 2-3 hours

---

## Refactoring Guidelines

### Before Refactoring

1. **Backup files:**

   ```bash
   cp services/agentDB.ts services/agentDB.ts.backup
   cp services/quality-gate-goap.ts services/quality-gate-goap.ts.backup
   cp hooks/useClinicalAnalysis.ts hooks/useClinicalAnalysis.ts.backup
   ```

2. **Run tests to establish baseline:**
   ```bash
   npm test -- --run --reporter=verbose
   ```

### During Refactoring

1. **Create new directory structure:**

   ```bash
   mkdir -p services/agentdb
   mkdir -p services/quality-gate
   mkdir -p hooks/useClinicalAnalysis
   ```

2. **Extract code incrementally:**
   - Start with utility functions (lowest risk)
   - Move to operations/core logic (medium risk)
   - Update imports and exports last

3. **Run tests after each extraction:**

   ```bash
   npm test -- --run --grep "<relevant test pattern>"
   ```

4. **Maintain backward compatibility:**
   - Keep original file until all tests pass
   - Use `index.ts` to re-export public APIs
   - Update imports gradually

### After Refactoring

1. **Verify all tests pass:**

   ```bash
   npm test -- --run
   ```

2. **Run lint and typecheck:**

   ```bash
   npm run lint
   npm run typecheck
   ```

3. **Check file sizes:**

   ```bash
   find services/agentdb -name "*.ts" | xargs wc -l
   find services/quality-gate -name "*.ts" | xargs wc -l
   find hooks/useClinicalAnalysis -name "*.ts" | xargs wc -l
   ```

4. **Delete backup files:**
   ```bash
   rm services/agentDB.ts.backup
   rm services/quality-gate-goap.ts.backup
   rm hooks/useClinicalAnalysis.ts.backup
   ```

---

## Test Files (Excluded from Complexity Analysis)

The following test files exceed 500 LOC but are excluded from complexity checks:

- `tests/unit/useClinicalAnalysis.test.ts` (901 lines)
- `tests/unit/vision.test.ts` (695 lines)
- `examples/quality-gate-execution.ts` (573 lines)

These files are already excluded in `sonar-project.properties` via:

```properties
sonar.exclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx
```

No action required unless they cause maintainability issues.

---

## Success Criteria

- ✅ All 3 files split into smaller files (< 500 LOC each)
- ✅ All tests pass after refactoring
- ✅ No lint errors introduced
- ✅ No TypeScript errors introduced
- ✅ SonarCloud complexity check passes

---

## Coordination Notes

- **Lint Agent:** Should review refactored code for code quality issues
- **Testing Agent:** Should verify all tests still pass
- **DevOps Agent:** No action required for refactoring

---

## Risk Mitigation

- **Rollback Strategy:** Keep backup files until verified
- **Test Coverage:** Maintain 100% test coverage during refactoring
- **Incremental Approach:** Refactor one file at a time
- **Import Management:** Update imports systematically to avoid circular dependencies

---

## Timeline Estimate

| File                          | Estimated Time | Dependencies |
| ----------------------------- | -------------- | ------------ |
| services/agentDB.ts           | 2-3 hours      | None         |
| services/quality-gate-goap.ts | 3-4 hours      | agentDB.ts   |
| hooks/useClinicalAnalysis.ts  | 2-3 hours      | Both above   |
| **Total**                     | **7-10 hours** | Sequential   |

---

## Questions?

- Should we create a separate PR for each file refactoring?
- Do we want to use the sub-hook approach for useClinicalAnalysis?
- Any specific naming conventions for the new directories?
