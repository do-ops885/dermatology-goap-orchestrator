# Agent Plan: Reliability-Architect
**Focus:** Resilience, Observability, Telemetry, Crash Reporting

## 1. Global Error Handling Strategy
**Status:** IMPLEMENTED

### 1.1 React Error Boundaries
- **Implementation:** ✅ Wrapped main `AgentFlow`, `FairnessDashboard`, and `AnalysisIntake`.
- **Fallback UI:** ✅ Displays module-specific crash messages with "Restart" button.

### 1.2 Async Error Handling (GOAP)
- **Pattern:** ✅ `useClinicalAnalysis.ts` wraps execution in Try/Catch.
- **Propagation:** ✅ Critical errors halt pipeline; Warnings trigger re-planning.
- **GOAP-Agent Tracing:** Add `runId` correlation and events `plan_start`, `agent_start`, `agent_end`, `plan_end` to support trace analysis.

## 2. Structured Logging
**Status:** IMPLEMENTED

### 2.1 Logger Specification
- **Service:** `services/logger.ts` handles generic logging with sanitation.
- **Privacy:** ✅ PII/Base64 redaction logic active.
- **GOAP-Agent Events:** Emit structured logs with `eventType: 'goap-agent'`, `runId`, and per-agent timings to assist debugging and SLA checks.

## 3. Performance Observability
**Status:** IMPLEMENTED

- **Metric:** ✅ Core Web Vitals (CLS, FID, LCP) captured via `reportWebVitals.ts`.
- **Reporting:** Logs to internal `Logger` (debug level) for analysis.

### 3.1 GOAP-Agent Metrics & Tasks
- [ ] Instrument `goap-agent` to emit `agent_latency_ms`, `agent_success_total`, `agent_failure_total`, `plan_duration_ms` via `services/logger.ts` (or wire into a lightweight in-app metrics buffer).
- [ ] Add a small realtime dashboard in `components/ModelProgress.tsx` or `components/AgentFlow.tsx` to visualize `runId` traces when debugging incidents.

## 4. Crash Prevention (Memory)
- **Monitoring:** Listen for `memory-warning` events (if available in Chrome).
- **Action:** `LocalLLMService` includes idle timer (5min) to auto-unload weights.
