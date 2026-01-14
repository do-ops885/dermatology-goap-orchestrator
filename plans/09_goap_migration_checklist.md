# Migration Checklist: Adopt `goap-agent` as the Orchestrator

This checklist lists concrete edits and tests to make `goap-agent` the canonical orchestrator at runtime.

## 1. Code Changes (Implementation)

- [ ] Refactor `services/goap.ts` to export a `GoapAgent` class with public API:
  - `plan(goal: WorldState): Plan`
  - `execute(plan: Plan): ExecutionTrace`
  - `replanIfNeeded(diff: Partial<WorldState>): Plan`
- [ ] Add `services/goap/registry.ts` to house agent manifest for runtime lookup.
- [ ] Update `hooks/useClinicalAnalysis.ts` to call `goapAgent.execute()` rather than directly embedding planner loops.
- [ ] Add telemetry hooks to `services/logger.ts` used by `GoapAgent`.

## 2. Tests

- [ ] `tests/unit/goap-agent.test.ts` — unit tests for `plan`, `execute`, `replanIfNeeded`.
- [ ] `tests/e2e/clinical-flow.spec.ts` — extend Happy Path to assert `goap-agent` trace existence and correctness.

## 3. Documentation

- [ ] Add `plans/07_goap_agent_orchestration.md` (done).
- [ ] Update `AGENTS.md` to include `GOAP-Agent` (done).
- [ ] Update `README.md` with a short paragraph describing the run-time orchestrator.

## 4. Observability & Rollout

- [ ] Add metrics to logger and surface them in a local debug dashboard.
- [ ] Feature-flag the `goap-agent` orchestrator while keeping the previous behavior behind a toggle for safe rollout.

---

_Use this checklist when implementing the orchestrator wrapper._
