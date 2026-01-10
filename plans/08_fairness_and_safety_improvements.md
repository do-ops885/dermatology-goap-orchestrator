# Agent Plan: Fairness & Safety Improvements
**Focus:** Reduce demographic performance gaps, tighten safety intercepts, and increase auditability.

## 1. Objectives
- Reduce observed TPR gaps across skin-tone groups by 30% in the next quarter.
- Add deterministic safety intercepts and a human-in-the-loop escalation path for ambiguous/critical findings.
- Ensure all fairness evaluations are reproducible and auditable via `AgentDB` traces.

## 2. Key Tasks
- **Data & Metrics:**
  - [ ] Extend `AgentDB` to record `caseMetadata: {skinToneEst, method, confidence}` for each sample.
  - [ ] Add nightly batch job (client-run cron via service worker) to compute historical TPR/FPR per group.
- **Algorithmic:**
  - [ ] Introduce fairness-aware thresholding in `Risk-Assessment-Agent` that can be toggled by `Fairness-Audit-Agent`.
  - [ ] Implement a small calibration table persisted in `AgentDB` (per skin-tone threshold overrides).
- **Safety Interception:**
  - [ ] Define explicit `safetyLevels` in `Audit-Trail-Agent` (e.g., `LOW`, `MEDIUM`, `HIGH`) and an escalation path for `HIGH` (show immediate clinician notification message).
  - [ ] Ensure `goap-agent` prioritizes `Safety-Calibration-Agent` when `is_low_confidence` or `ambiguous_detection` flags appear.
- **Human-in-the-loop:**
  - [ ] Add UI path in `DiagnosticSummary` for clinician feedback that updates `AgentDB` and triggers `Learning-Agent` to reweight retrieval relevance.

## 3. Testing & Validation
- Unit tests for fairness computation and threshold override logic.
- E2E scenario that simulates biased historical data and verifies the recalibration path results in decreased TPR gap after update.

## 4. Observability
- Track `tpr_gap_by_group` metric, and add a dashboard widget to `FairnessDashboard.tsx` that shows trends and intervention recommendations.

---
*Signed: Fairness & Safety Plan (Draft)*
