# Test Coverage Roadmap to 80%

**Status:** Active  
**Current Coverage:** 44.19% statements, 38.18% branches, 43.21% functions, 44.73% lines  
**Target Coverage:** 80% across all metrics  
**Last Updated:** 2026-01-25

---

## Executive Summary

This document outlines a phased approach to increase test coverage from the current ~44% to the target 80%. The strategy prioritizes:

1. **High-value, low-coverage files** (business-critical with 0% coverage)
2. **Quick wins** (small utility files that can reach 100% easily)
3. **Incremental improvements** (files with partial coverage)

---

## Current State Analysis

### Coverage Breakdown by Category

| Category           | Statements | Branches | Functions | Lines  | Status      |
| ------------------ | ---------- | -------- | --------- | ------ | ----------- |
| **Overall**        | 44.19%     | 38.18%   | 43.21%    | 44.73% | 🟡 Moderate |
| Components         | 36.78%     | 26.62%   | 38.05%    | 37.46% | 🔴 Low      |
| Hooks              | 59.49%     | 34.88%   | 38.23%    | 59.13% | 🟡 Moderate |
| Services           | 45.00%     | 40.88%   | 48.63%    | 46.02% | 🟡 Moderate |
| Services/Executors | 45.38%     | 41.11%   | 42.76%    | 45.97% | 🟡 Moderate |
| Services/GOAP      | 66.87%     | 59.13%   | 63.33%    | 67.32% | 🟢 Good     |
| Services/Utils     | 22.03%     | 42.46%   | 16.00%    | 19.26% | 🔴 Low      |

### Files with 0% Coverage (21 files)

#### **Critical Business Logic (High Priority)**

1. **auditTrail.ts** (0%, 292 lines) - Audit logging for compliance
2. **consentManager.ts** (0%, 234 lines) - GDPR consent handling
3. **gpuMemoryPool.ts** (0%, 306 lines) - GPU memory management
4. **localLLMService.ts** (0%, 92 lines) - Local LLM inference
5. **memoryMonitor.ts** (0%, 213 lines) - Memory leak detection
6. **recoveryCoordinator.ts** (0%, 96 lines) - GOAP failure recovery

#### **UI Components (Medium Priority)**

7. **AgentFlow.tsx** (0%, 232 lines) - Agent orchestration visualization
8. **AnalysisIntake.tsx** (0%, 166 lines) - Image upload flow
9. **ClinicianFeedback.tsx** (0%, 104 lines) - Feedback collection
10. **FairnessReport.tsx** (0%, 434 lines) - Fairness metrics display
11. **ModelProgress.tsx** (0%, 1 line) - Progress indicator
12. **NotificationCenter.tsx** (0%, 97 lines) - User notifications
13. **PatientSafetyState.tsx** (0%, 67 lines) - Safety warnings
14. **TraceTimeline.tsx** (0%, 76 lines) - Agent execution timeline

#### **Supporting Services (Low Priority)**

15. **agent-timings.ts** (0%, 85 lines) - Performance telemetry
16. **notifications.ts** (0%, 78 lines) - Notification service
17. **reportWebVitals.ts** (0%, 74 lines) - Web vitals reporting
18. **serviceRegistry.ts** (0%, 50 lines) - Service locator pattern
19. **quality-gate-monitor.ts** (0%, 163 lines) - Quality gate monitoring

#### **Utility Functions (Quick Wins)**

20. **imageUtils.ts** (0%, 70 lines) - Image manipulation helpers
21. **jsonUtils.ts** (0%, 8 lines) - JSON utilities

---

## Phased Implementation Plan

### Phase 1: Quick Wins & Foundation (Target: 50% coverage)

**Duration:** 1-2 weeks  
**Effort:** Low  
**Impact:** High visibility, establishes testing patterns

#### Tasks:

- [ ] **jsonUtils.ts** → 100% (8 lines, ~30 min)
- [ ] **ModelProgress.tsx** → 100% (1 line, ~15 min)
- [ ] **imageUtils.ts** → 80% (70 lines, ~2 hours)
- [ ] **serviceRegistry.ts** → 70% (50 lines, ~2 hours)
- [ ] **notifications.ts** → 70% (78 lines, ~3 hours)

**Expected Coverage Gain:** +2-3% statements

---

### Phase 2: Critical Business Logic (Target: 60% coverage)

**Duration:** 2-3 weeks  
**Effort:** Medium  
**Impact:** High - ensures reliability of core features

#### Tasks:

- [ ] **auditTrail.ts** → 70% (292 lines, ~1 day)
  - Test: storeAuditEvent, getAuditLog, encryption integration
- [ ] **consentManager.ts** → 70% (234 lines, ~1 day)
  - Test: GDPR consent flow, storage, retrieval
- [ ] **memoryMonitor.ts** → 60% (213 lines, ~1 day)
  - Test: leak detection, threshold alerts, cleanup
- [ ] **localLLMService.ts** → 60% (92 lines, ~4 hours)
  - Test: model loading, inference, error handling
- [ ] **recoveryCoordinator.ts** → 70% (96 lines, ~4 hours)
  - Test: failure detection, retry logic, fallback strategies

**Expected Coverage Gain:** +6-8% statements

---

### Phase 3: UI Components (Target: 70% coverage)

**Duration:** 3-4 weeks  
**Effort:** High  
**Impact:** Medium - improves user-facing reliability

#### Tasks:

- [ ] **AnalysisIntake.tsx** → 70% (166 lines, ~1 day)
  - Test: file upload, validation, drag-drop
- [ ] **ClinicianFeedback.tsx** → 70% (104 lines, ~4 hours)
  - Test: form submission, validation, state management
- [ ] **NotificationCenter.tsx** → 70% (97 lines, ~4 hours)
  - Test: notification display, dismissal, priority
- [ ] **PatientSafetyState.tsx** → 70% (67 lines, ~3 hours)
  - Test: safety warnings, state transitions
- [ ] **TraceTimeline.tsx** → 60% (76 lines, ~4 hours)
  - Test: timeline rendering, agent step display

**Expected Coverage Gain:** +4-5% statements

---

### Phase 4: Complex Components (Target: 75% coverage)

**Duration:** 2-3 weeks  
**Effort:** High  
**Impact:** High - comprehensive UI testing

#### Tasks:

- [ ] **AgentFlow.tsx** → 60% (232 lines, ~2 days)
  - Test: flow diagram rendering, node interactions, state updates
- [ ] **FairnessReport.tsx** → 60% (434 lines, ~2 days)
  - Test: metrics display, chart rendering, data visualization

**Expected Coverage Gain:** +3-4% statements

---

### Phase 5: Infrastructure & Optimization (Target: 80% coverage)

**Duration:** 2-3 weeks  
**Effort:** Medium  
**Impact:** High - production readiness

#### Tasks:

- [ ] **gpuMemoryPool.ts** → 70% (306 lines, ~1.5 days)
  - Test: memory allocation, deallocation, leak detection
- [ ] **agent-timings.ts** → 60% (85 lines, ~4 hours)
  - Test: timing metrics, performance tracking
- [ ] **reportWebVitals.ts** → 60% (74 lines, ~3 hours)
  - Test: web vitals collection, reporting
- [ ] **quality-gate-monitor.ts** → 60% (163 lines, ~1 day)
  - Test: quality gate checks, monitoring, alerts
- [ ] Improve existing partial coverage files to 80%+
  - imageProcessing.ts (22% → 80%)
  - useClinicalAnalysis.ts (55% → 80%)
  - Several executor files (4-25% → 60%+)

**Expected Coverage Gain:** +5-6% statements

---

## Testing Strategies by File Type

### Components (.tsx)

- Use `@testing-library/react` for user interactions
- Mock external services and hooks
- Test accessibility (a11y) with `@axe-core/react`
- Test error boundaries and fallback states

### Services (.ts)

- Unit test pure functions with various inputs
- Mock external dependencies (crypto, AgentDB, etc.)
- Test error handling and edge cases
- Integration tests for service interactions

### Executors (.ts)

- Mock world state and agent actions
- Test preconditions and effects
- Verify cost calculations
- Test error recovery and graceful degradation

### Utilities (.ts)

- Aim for 100% coverage (they're pure functions)
- Test edge cases and boundary conditions
- Property-based testing where applicable

---

## Coverage Threshold Milestones

| Phase       | Target Coverage | Thresholds (S/B/F/L) | Timeline |
| ----------- | --------------- | -------------------- | -------- |
| **Current** | 44%             | 44/38/43/44          | ✅ Done  |
| **Phase 1** | 50%             | 50/42/48/50          | Week 2   |
| **Phase 2** | 60%             | 60/50/55/60          | Week 5   |
| **Phase 3** | 70%             | 70/60/65/70          | Week 9   |
| **Phase 4** | 75%             | 75/65/70/75          | Week 12  |
| **Phase 5** | 80%             | 80/70/75/80          | Week 15  |

**Legend:** S=Statements, B=Branches, F=Functions, L=Lines

---

## Maintenance & Best Practices

### CI/CD Integration

- Coverage reports generated on every PR
- Block merges if coverage drops below threshold
- Weekly coverage trend reports

### Testing Guidelines

1. Write tests before increasing thresholds
2. Aim for meaningful tests, not just coverage numbers
3. Focus on critical paths and error handling
4. Use snapshot tests sparingly
5. Keep tests fast (<50ms per test ideal)

### Coverage Exceptions

Some files may never reach 80% due to:

- Third-party library wrappers
- Platform-specific code (WebGPU fallbacks)
- Complex UI animations (difficult to test)

Document exceptions in `vitest.config.ts` exclude list.

---

## Success Metrics

- ✅ Zero regression in coverage on new PRs
- ✅ All critical business logic >70% coverage
- ✅ All utility functions >90% coverage
- ✅ UI components >60% coverage
- ✅ Overall project >80% coverage

---

## Next Steps

1. ✅ Update `vitest.config.ts` thresholds to 44% (current state)
2. ⏳ Begin Phase 1 quick wins (jsonUtils, ModelProgress, imageUtils)
3. ⏳ Create test files for Phase 1 targets
4. ⏳ Run `npm run test:ci` to verify thresholds pass
5. ⏳ Document testing patterns in `tests/README.md`

---

**Maintained by:** Development Team  
**Review Cadence:** Weekly during active phases, monthly during maintenance
