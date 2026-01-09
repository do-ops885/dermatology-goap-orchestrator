# Agent Plan: QA-Specialist
**Focus:** Reliability, Regression Prevention, Component Validation

## 1. Objectives
- **Current Coverage:** Core GOAP Logic (Unit), Clinical Flow (E2E), Key Components.
- **Target:** >90% Coverage on `services/agentDB.ts` and `services/vision.ts`.

## 2. Technology Stack
- **Unit Testing:** `Vitest`
- **E2E Testing:** `Playwright`

## 3. Implementation Tasks

### 3.1 Unit Test Suite (`src/__tests__`)
- [x] **GOAP Planner Tests:** Verified A*, heuristics, and replanning.
- [x] **AgentDB Tests:** Verified aggregation logic.
- [x] **Vision Service Tests:** Verified fallback logic.

### 3.2 E2E Scenarios (`e2e/`)
- [x] **Scenario A: Happy Path** (Upload -> Analysis -> Summary)
- [x] **Scenario B: Safety Interception** (Low Confidence -> Calibration)
- [x] **Scenario C: Security/Error Handling** (Invalid File Types)
- [x] **Scenario D: Offline Mode**

### 3.3 Component Testing
- [x] **FairnessDashboard:** ✅ Verified chart rendering and metrics calculation.
- [x] **DiagnosticSummary:** ✅ Verified content rendering and JSON export triggers.

## 4. Folder Structure
```
/
├── tests/
│   ├── unit/
│   │   ├── goap.test.ts
│   │   ├── agentDB.test.ts
│   │   └── vision.test.ts
│   ├── components/
│   │   ├── FairnessDashboard.test.tsx
│   │   └── DiagnosticSummary.test.tsx
│   ├── e2e/
│   │   └── clinical-flow.spec.ts
```
