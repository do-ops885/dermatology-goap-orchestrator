# Agent Plan: GOAP-Agent (Orchestrator)
**Focus:** Runtime orchestration, plan execution, agent lifecycle, and observability

## 1. Objective
- Introduce **`goap-agent`** as the canonical orchestrator for the clinical pipeline. This agent centralizes planning, execution, re-planning, and remains lightweight and auditable.

## 2. Responsibilities
- Construct plans to reach desired world states using `services/goap.ts` A* planner logic.
- Provide a thin runtime wrapper that: registers agents, enforces preconditions, dispatches `execute()` calls, collects results, and emits structured traces.
- Handle failures via retries, fallback (e.g., route to `Safety-Calibration-Agent`), and graceful skipping of non-critical agents.
- Expose a clear telemetry contract for per-agent latency, success/failure counts, queue length, and replan events.

## 3. Design & Interfaces
- **Agent Registry:** A JSON manifest mapping `agentId -> {preconditions, effects, role, planPriority}` (kept in `services/goap.ts` or `services/goap/registry.ts`).
- **Execution API (Runtime):**
  - `goapAgent.plan(goalState: WorldState): Plan` — returns prioritized sequence of actions.
  - `goapAgent.execute(plan: Plan): ExecutionTrace` — runs agents in order, collects outputs, and returns structured trace (timestamps, durations, status).
  - `goapAgent.replanIfNeeded(stateDiff)` — supports mid-flight replanning.
- **Trace Format (JSON):**
  - `{runId, startTime, agents: [{id, startTime, endTime, status, logs}], endTime, finalWorldState}`

## 4. Failure Modes & Policies
- **Non-Critical Agent Failure:** Mark status `skipped` and continue; emit `warning` event.
- **Critical Failure (precondition unmet):** Abort and `replan` with higher fallback priorities or surface human-in-the-loop.
- **Timeouts:** Default per-agent timeout (e.g., 10s) configurable via env or runtime.

## 5. Testing Strategy
- Unit tests for `plan()` (deterministic ordering), `replanIfNeeded()` and trace schema (`tests/unit/goap-agent.test.ts`).
- E2E tests (Playwright) to assert end-to-end orchestration trace shape and safety fallbacks (`tests/e2e/clinical-flow.spec.ts`).

## 6. Observability & Telemetry
- Emit the following metrics: `agent_latency_ms`, `agent_success_total`, `agent_failure_total`, `plan_duration_ms`, `replan_total`.
- Add structured logs to `services/logger.ts` with `eventType: 'goap-agent'` and `runId` correlation.

## 7. Implementation Tasks
- [x] Add `goap-agent` entry to `AGENTS.md` and `plans/00_master_orchestration.md`.
- [x] Refactor `services/goap.ts` to export a `GoapAgent` wrapper with the APIs above. (Implemented: `services/goap/agent.ts`)
- [x] Add unit tests in `tests/unit/goap-agent.test.ts`. (Added; pending execution)
- [ ] Add E2E assertions for orchestration behavior and traces. (Planned)
- [x] Add basic telemetry/log hooks (`plan_start`, `agent_start`, `agent_end`, `plan_end`) via `services/logger.ts`. (Added; metrics wiring TODO)
- [ ] Add a small visual trace in `components/AgentFlow.tsx` to display `runId` + agent timings. (Planned / UX task)

> Note: Integration is complete and unit tests are present, however executing the install/lint/build/test steps failed in this environment due to a filesystem provider error (ENOPRO). Please run the verification steps locally or in CI: `npm install && npm run lint && npm run build && npm test`.

## 8. Backward Compatibility
- Keep existing plan files and agent IDs stable; `goap-agent` acts as a runtime orchestrator and does not change agent semantics.

---
*Signed: GOAP-Agent Plan (Draft)*
