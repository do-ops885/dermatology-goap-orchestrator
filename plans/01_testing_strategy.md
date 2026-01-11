# Agent Plan: Testing Strategy
**Focus:** Reliability, Regression Prevention, Component Validation
**Last Updated:** 2026-01-11

## 0. Current Analysis (2026-01-11 - UPDATED)

### 0.1 Test Status
| Test Type | Status | Files | Coverage |
|-----------|--------|-------|----------|
| Unit Tests | ✅ **Complete** | 8 test files | `goap.test.ts`, `goap-agent.test.ts`, `agentDB.test.ts`, `vision.test.ts`, `vision-memory.test.ts`, executors (5 files) |
| E2E Tests | ✅ **Implemented** | 4 test files | `clinical-flow.spec.ts` (266 lines), `performance.spec.ts` (168 lines), `memory-leaks.spec.ts` |
| A11y Tests | ✅ **Implemented** | 3 test files | `components.spec.ts`, `forms.spec.ts`, `navigation.spec.ts` |
| Performance Tests | ✅ **Implemented** | 1 test file | `agent-timings.spec.ts` (127 lines) |
| Component Tests | ⚠️ **Partial** | 2 test files | `FairnessDashboard.test.tsx`, `DiagnosticSummary.test.tsx` |

### 0.2 Dependencies Status
```bash
npm run test  # ✅ Working (Vitest with jsdom)
npm run lint  # ✅ Working (ESLint with TypeScript strict mode)
npx playwright test  # ✅ Working (Playwright with mobile support)
```
**Status:** All test commands working correctly after dependency installation.

## 1. Objectives
- **Current Coverage:** Core GOAP Logic (Unit), Clinical Flow (E2E), Key Components
- **Target:** >80% Coverage on all services, >70% on components
- **2025 Focus:** Vitest coverage thresholds, Playwright component testing, AI testing patterns

## 2. Technology Stack
- **Unit Testing:** `Vitest` (jsdom, non-threaded)
- **E2E Testing:** `Playwright`
- **Component Testing:** `@playwright/experimental-ct-react`

## 3. Implementation Tasks

### 3.1 Unit Test Suite (`tests/unit/`)

#### GOAP Planner Tests (`goap.test.ts`)
- [x] A* pathfinding finds optimal sequence
- [x] Heuristic provides admissible estimates
- [x] Preconditions enforce action eligibility
- [x] Effects correctly update state
- [x] Multi-effect actions handled properly
- [x] Unreachable goals throw errors
- [x] Already-satisfied goals return empty plan
- [x] 5000 iteration cap prevents infinite loops
- [x] Closed-set prevents duplicate state exploration
- [x] Replanning finds alternative paths

#### GOAP-Agent Tests (`goap-agent.test.ts`)
- [x] Plan generation returns correct action sequence
- [x] Execution trace collects per-agent timing
- [x] State updates applied after each agent
- [x] Dynamic replanning on `shouldReplan`
- [x] Critical errors abort pipeline
- [x] Non-critical errors mark agents as skipped
- [x] Timeout enforcement (10s default)
- [x] Missing executors throw errors

#### Vision Service Tests (`vision.test.ts`)
- [x] Backend selection prioritizes WebGPU
- [x] Fallback to WebGL when WebGPU unavailable
- [x] Fallback to CPU as last resort
- [x] Model loading from remote URL
- [x] Classification returns top-3 results
- [x] Confidence scores sum to 1.0
- [x] Heatmap generation returns DataURL
- [x] `tf.tidy()` prevents memory leaks

#### AgentDB Tests (`agentDB.test.ts`)
- [x] Vector store queries return results
- [x] Fairness aggregation computes TPR/FPR
- [x] Audit log retrieval
- [x] Local LLM initialization

#### Executor Tests (NEW)
- [ ] Image-Verification-Agent: Validates magic bytes
- [ ] Skin-Tone-Detection-Agent: Returns Fitzpatrick type
- [ ] Safety-Calibration-Agent: Sets conservative thresholds
- [ ] Lesion-Detection-Agent: Returns classifications
- [ ] Fairness-Audit-Agent: Validates TPR gaps

### 3.2 E2E Scenarios (`tests/e2e/`)

> **⚠️ Status: NOT IMPLEMENTED** - These tests need to be created

#### Scenario A: Happy Path
- [ ] Upload valid JPEG image
- [ ] Execute full 16-agent pipeline
- [ ] Verify final `audit_logged: true`
- [ ] Validate execution trace structure

#### Scenario B: Safety Interception
- [ ] Simulate low confidence (< 0.65)
- [ ] Verify GOAP routes to Safety-Calibration-Agent
- [ ] Check warning UI displayed
- [ ] Confirm safety_calibrated: true

#### Scenario C: Security/Error Handling
- [ ] Reject invalid file types
- [ ] Validate magic bytes checking
- [ ] Verify SHA-256 hash generation
- [ ] Test Ed25519 signature validation

#### Scenario D: Offline Mode
- [ ] Disable network requests
- [ ] Verify local inference works
- [ ] Check fallback to local LLM

#### Scenario E: Orchestration Trace
- [ ] Assert trace contains `plan_start` event
- [ ] Assert each agent has `agent_start`/`agent_end`
- [ ] Verify `plan_end` with duration
- [ ] Validate `replan` events when triggered

#### Scenario F: Memory Leaks
- [ ] Run 50 analyses sequentially
- [ ] Verify GPU memory doesn't grow
- [ ] Check tensor cleanup via `tf.memory()`

#### Scenario G: Performance Benchmarks
- [ ] Measure TTI with heavy models
- [ ] Time individual agent execution
- [ ] Assert < 72s total pipeline time

### 3.3 Component Testing

#### Existing Tests
- [x] FairnessDashboard: Chart rendering
- [x] DiagnosticSummary: Content rendering, JSON export

#### New Component Tests
- [ ] AnalysisIntake.test.tsx: File upload, drag-drop, privacy toggle
- [ ] AgentFlow.test.tsx: Log rendering, status icons, scrolling
- [ ] PatientSafetyState.test.tsx: State indicators, transitions
- [ ] ModelProgress.test.tsx: Progress bar, percentage updates

## 4. Test Patterns

### 4.1 GOAP Planner Tests
```typescript
describe('GOAPPlanner', () => {
  it('should plan a sequence of actions to reach the goal', () => {
    const planner = new GOAPPlanner();
    const plan = planner.plan(INITIAL_STATE, { audit_logged: true });
    expect(plan.length).toBeGreaterThan(0);
  });

  it('should respect preconditions', () => {
    // Actions requiring image_verified should not appear
    // before Image-Verification-Agent
  });

  it('should replan correctly from intermediate states', () => {
    // After partial execution, replan should continue
  });
});
```

### 4.2 Vision Service Tests
```typescript
describe('VisionSpecialist', () => {
  it('should classify image with HAM10000 classes', async () => {
    const specialist = VisionSpecialist.getInstance();
    const results = await specialist.classify(mockImage);
    expect(results).toHaveLength(3);
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('should generate heatmap as DataURL', async () => {
    const specialist = VisionSpecialist.getInstance();
    const heatmap = await specialist.getHeatmap(mockImage);
    expect(heatmap.startsWith('data:image')).toBe(true);
  });
});
```

### 4.3 Safety Interception Tests
```typescript
it('should route through Safety-Calibration-Agent on low confidence', async () => {
  const lowConfidenceState = {
    ...INITIAL_STATE,
    skin_tone_detected: true,
    confidence_score: 0.42,
    is_low_confidence: true
  };

  const planner = new GOAPPlanner();
  const plan = planner.plan(lowConfidenceState, { audit_logged: true });

  const safetyCalibrationIndex = plan.findIndex(
    a => a.agentId === 'Safety-Calibration-Agent'
  );
  expect(safetyCalibrationIndex).toBeGreaterThan(-1);
});
```

### 4.4 AI/ML Testing Patterns
- **Deterministic Mocking:** Mock TF.js and WebLLM for reproducible tests
- **Confidence Score Testing:** Verify agents always return 0-1 confidence
- **Memory Cleanup Testing:** Assert `.dispose()` called on all tensors
- **Error Boundary Testing:** Test graceful degradation of non-critical agents

## 5. Vitest Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', 'dist/'],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    },
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    environment: 'jsdom'
  }
});
```

## 6. Folder Structure
```
/
├── tests/
│   ├── unit/
│   │   ├── goap.test.ts
│   │   ├── goap-agent.test.ts
│   │   ├── agentDB.test.ts
│   │   ├── vision.test.ts
│   │   └── executors/
│   │       ├── image-verification.test.ts
│   │       ├── skin-tone-detection.test.ts
│   │       ├── safety-calibration.test.ts
│   │       └── lesion-detection.test.ts
│   ├── components/
│   │   ├── AnalysisIntake.test.tsx
│   │   ├── AgentFlow.test.tsx
│   │   ├── FairnessDashboard.test.tsx
│   │   └── DiagnosticSummary.test.tsx
│   ├── e2e/
│   │   ├── clinical-flow.spec.ts
│   │   ├── safety-interception.spec.ts
│   │   ├── memory-leaks.spec.ts
│   │   └── performance.spec.ts
│   ├── setup.ts
│   └── coverage/
```

## 7. Key Test Data

### 7.1 HAM10000 Classes
```typescript
const CLASSES = [
  { id: 'akiec', name: 'Actinic Keratoses', risk: 'Medium' },
  { id: 'bcc', name: 'Basal Cell Carcinoma', risk: 'High' },
  { id: 'bkl', name: 'Benign Keratosis', risk: 'Low' },
  { id: 'df', name: 'Dermatofibroma', risk: 'Low' },
  { id: 'mel', name: 'Melanoma', risk: 'High' },
  { id: 'nv', name: 'Melanocytic Nevi', risk: 'Low' },
  { id: 'vasc', name: 'Vascular Lesion', risk: 'Low' }
];
```

### 7.2 Fitzpatrick Types
```typescript
type FitzpatrickType = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
```

### 7.3 Confidence Thresholds
| Level | Threshold | Expected Path |
|:---|:---:|:---|
| High | ≥ 0.65 | Standard-Calibration-Agent |
| Low | < 0.65 | Safety-Calibration-Agent |

## 8. Accessibility Testing
- Automated a11y tests with `@axe-core/react`
- Keyboard navigation testing in Playwright
- Screen reader announcement verification
---

*Signed: QA-Specialist Plan (Updated 2026-01-11)*
