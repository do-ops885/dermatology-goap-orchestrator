# Agent Plan: GOAP-Agent (Orchestrator)

**Focus:** Runtime orchestration, plan execution, agent lifecycle, and observability
**Last Updated:** 2026-01-15

## 1. Objective

- Introduce **`goap-agent`** as the canonical orchestrator for the clinical pipeline. This agent centralizes planning, execution, re-planning, and remains lightweight and auditable.

## 2. Responsibilities

- Construct plans to reach desired world states using `services/goap.ts` A\* planner logic.
- Provide a thin runtime wrapper that: registers agents, enforces preconditions, dispatches `execute()` calls, collects results, and emits structured traces.
- Handle failures via retries, fallback (e.g., route to `Safety-Calibration-Agent`), and graceful skipping of non-critical agents.
- Expose a clear telemetry contract for per-agent latency, success/failure counts, queue length, and replan events.

## 3. Design & Interfaces

### 3.1 Agent Registry (AVAILABLE_ACTIONS)

Located in `services/goap.ts` (lines 3-132):

| Agent ID                   | Cost | Precondition                                     | Effect                                      |
| :------------------------- | :--: | :----------------------------------------------- | :------------------------------------------ |
| Image-Verification-Agent   |  1   | None                                             | `image_verified: true`                      |
| Skin-Tone-Detection-Agent  |  2   | `image_verified`                                 | `skin_tone_detected`                        |
| Standard-Calibration-Agent |  1   | `skin_tone_detected`, `is_low_confidence: false` | `calibration_complete`                      |
| Safety-Calibration-Agent   |  1   | `skin_tone_detected`, `is_low_confidence: true`  | `calibration_complete`, `safety_calibrated` |
| Image-Preprocessing-Agent  |  2   | `calibration_complete`                           | `image_preprocessed`                        |
| Segmentation-Agent         |  5   | `image_preprocessed`                             | `segmentation_complete`                     |
| Feature-Extraction-Agent   |  8   | `segmentation_complete`                          | `features_extracted`                        |
| Lesion-Detection-Agent     |  10  | `features_extracted`                             | `lesions_detected`                          |
| Similarity-Search-Agent    |  1   | `lesions_detected`                               | `similarity_searched`                       |
| Risk-Assessment-Agent      |  3   | `similarity_searched`                            | `risk_assessed`                             |
| Fairness-Audit-Agent       |  2   | `risk_assessed`                                  | `fairness_validated`                        |
| Web-Verification-Agent     |  4   | `fairness_validated`                             | `web_verified`                              |
| Recommendation-Agent       |  4   | `web_verified`                                   | `recommendations_generated`                 |
| Learning-Agent             |  2   | `recommendations_generated`                      | `learning_updated`                          |
| Privacy-Encryption-Agent   |  2   | `learning_updated`                               | `data_encrypted`                            |
| Audit-Trail-Agent          |  1   | `data_encrypted`                                 | `audit_logged`                              |

### 3.2 Execution API

```typescript
class GoapAgent {
  plan(startState: WorldState, goalState: Partial<WorldState>): AgentAction[];
  execute(startState, goalState, ctx): Promise<ExecutionTrace>;
}

interface ExecutionTrace {
  runId: string;
  startTime: number;
  endTime?: number;
  agents: ExecutionAgentRecord[];
  finalWorldState: WorldState;
}

interface ExecutionAgentRecord {
  id: string;
  agentId: string;
  name?: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  metadata?: Record<string, any>;
  error?: string;
}
```

### 3.3 A\* Planner Implementation

- **Algorithm:** A\* search with F-score prioritization (lines 179-181)
- **Heuristic:** Backward-chaining through dependency chain (lines 238-284)
- **Safety:** 5000 iteration cap prevents infinite loops (line 172)
- **State Keying:** Deterministic string representation for closed-set tracking (lines 312-318)

### 3.4 Dynamic Replanning

- Agents can set `shouldReplan: true` in result
- Automatically triggers new plan calculation from current state
- Used for confidence-driven safety routing

## 4. Failure Modes & Policies

### 4.1 Critical vs Non-Critical

- **Critical Error:** Contains "Critical" string → aborts entire pipeline
- **Non-Critical Error:** Agent marked `skipped`, execution continues
- **Timeout:** 10s default per-agent (configurable)

### 4.2 Safety Routing Example

```
Skin-Tone-Agent returns confidence: 0.42
  → sets is_low_confidence: true
  → next replan selects Safety-Calibration-Agent
  → lower threshold (0.50) applied instead of 0.65
```

## 5. Testing Strategy

### 5.1 Unit Tests (`tests/unit/goap.test.ts`)

- A\* pathfinding correctness
- Heuristic admissibility
- Precondition enforcement
- Multi-effect action handling
- Unreachable goal error handling

### 5.2 E2E Tests (`tests/e2e/clinical-flow.spec.ts`)

- Happy path execution trace validation
- Safety interception routing verification
- Replan trigger on confidence change

## 6. Observability & Telemetry

### 6.1 Structured Events

| Event              | Fields                           |
| :----------------- | :------------------------------- |
| `plan_start`       | runId, goalState                 |
| `agent_start`      | runId, agent, action             |
| `agent_end`        | runId, agent, status, durationMs |
| `plan_end`         | runId, durationMs                |
| `replan_triggered` | runId, agent                     |
| `replan_complete`  | runId, durationMs, newPlan       |

### 6.2 Metrics

- `agent_latency_ms` (per-agent)
- `agent_success_total`
- `agent_failure_total`
- `plan_duration_ms`
- `replan_total`

## 7. Implementation Tasks

- [x] Add `goap-agent` entry to `AGENTS.md`
- [x] Implement `services/goap.ts` A\* planner (338 LOC)
- [x] Implement `services/goap/agent.ts` orchestrator (185 LOC)
- [x] Define 16 agents with preconditions/effects/costs
- [x] Add backward-chaining heuristic algorithm
- [x] Add 5000 iteration safety cap
- [x] Implement dynamic replanning on `shouldReplan`
- [x] Add execution trace collection
- [x] Add structured logging via `services/logger.ts`
- [x] Add unit tests for planner (`goap.test.ts` 166 LOC)
- [x] Add failure scenario tests (`goap-agent-failures.test.ts` 314 LOC, 8 tests)
- [x] Add E2E trace validation (`clinical-flow.spec.ts` 472 LOC)
- [x] Add real-time trace visualization UI (`components/AgentFlow.tsx` 227 LOC)

**Status: ✅ COMPLETE** - All implementation tasks completed successfully.

## 8. Cost Rationale

- **Verify Image (1):** Fast cryptographic check
- **Detect Lesions (10):** Expensive TF.js inference
- **Extract Features (8):** FairDisCo disentanglement
- **Safety Calibration (1):** Fast threshold adjustment

---

_Signed: GOAP-Agent Plan (Updated 2026-01-15)_
