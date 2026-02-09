# Migration Checklist: Adopt `goap-agent` as the Orchestrator

**Last Updated: 2026-01-15**

This checklist lists concrete edits and tests to make `goap-agent` the canonical orchestrator at runtime.

## 1. Code Changes (Implementation)

- [x] Refactor `services/goap.ts` to export a `GoapAgent` class with public API:
  - `plan(goal: WorldState): Plan`
  - `execute(plan: Plan): ExecutionTrace`
  - `replanIfNeeded(diff: Partial<WorldState>): Plan`
- [x] Add `services/goap/agent.ts` to house agent orchestrator (145 LOC).
- [x] Update `hooks/useClinicalAnalysis.ts` to use executor pattern with `services/executors/`.
- [x] Add telemetry hooks to `services/logger.ts` used by `GoapAgent`.
- [x] Implement event bus for agent communication (`services/eventBus.ts`)
- [x] Define structured error types and propagation mechanism (`services/errors.ts`)
- [x] Add agent health check endpoints/methods (`services/agentHealth.ts`)
- [x] Implement circuit breaker pattern for external services (`services/circuitBreaker.ts`)

## 2. Tests

- [x] `tests/unit/goap-agent.test.ts` — unit tests for `plan`, `execute`, `replanIfNeeded`.
- [x] `tests/unit/goap-agent-failures.test.ts` — additional failure scenario tests (8 comprehensive tests).
- [x] `tests/e2e/clinical-flow.spec.ts` — extended with orchestration trace validation (266 LOC).

## 3. Documentation

- [x] Add `plans/07_goap_agent_orchestration.md` (complete).
- [x] Update `AGENTS.md` to include `GOAP-Agent` (complete).
- [x] Add `plans/10_pr_summary_and_testing_checklist.md` (complete).
- [x] Update `README.md` with GOAP orchestrator description.

## 4. Observability & Rollout

- [x] Add metrics to logger and execution trace collection.
- [x] Implement execution trace visualization in `AgentFlow.tsx`.
- [x] GOAP-Agent is the primary orchestrator (no feature flag needed).

## 5. Future Enhancements

- **Distributed Agent Coordination**: Support for multi-node agent communication
- **Dynamic Plan Caching**: Runtime plan memoization based on similar world states
- **Agent Versioning**: Support for hot-swapping agent implementations
- **Execution Playback**: Debug mode to replay execution traces step-by-step
- **Priority Scheduling**: Weighted task scheduling based on clinical urgency

---

_Use this checklist when implementing the orchestrator wrapper._
