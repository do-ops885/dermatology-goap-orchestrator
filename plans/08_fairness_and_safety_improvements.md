# Agent Plan: Fairness & Safety Improvements
**Focus:** Reduce demographic performance gaps, tighten safety intercepts, and increase auditability
**Last Updated:** 2026-01-11

## 0. Current Analysis (2026-01-11)

### 0.1 Implementation Gaps Identified
| Component | Status | Lines |
|-----------|--------|-------|
| Per-group TPR/FPR computation | ⚠️ Partial | `services/agentDB.ts:46-114` |
| Clinician feedback integration | ❌ Missing | - |
| Nightly batch analytics | ❌ Missing | - |
| FairnessDashboard UI component | ❌ Missing | - |

### 0.2 Priority Actions
1. **P0:** Implement per-group TPR/FPR metrics in `services/agentDB.ts`
2. **P1:** Create FairnessDashboard component
3. **P2:** Add clinician feedback path

## 1. Objectives
- Reduce observed TPR gaps across skin-tone groups by 30% in the next quarter.
- Add deterministic safety intercepts and a human-in-the-loop escalation path for ambiguous/critical findings.
- Ensure all fairness evaluations are reproducible and auditable via `AgentDB` traces.

## 2. Current Implementation Details

### 2.1 Fitzpatrick Scale Tracking (types.ts)
```typescript
type FitzpatrickType = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
```

### 2.2 Confidence Thresholds
| Level | Threshold | Agent | Action |
|:---|:---:|:---|:---|
| High Confidence | ≥ 0.65 | Standard-Calibration-Agent | Standard fairness thresholds |
| Low Confidence | < 0.65 | Safety-Calibration-Agent | Conservative margins (0.50) |

### 2.3 FairDisCo Disentanglement
- **Bias Score:** 0-1 extracted during feature extraction
- **Disentanglement Index:** Measures fairness correlation
- **Validation:** Fairness-Audit-Agent checks gaps against thresholds

### 2.4 WorldState Tracking
```typescript
interface WorldState {
  confidence_score: number;      // 0-1 from skin tone detection
  fairness_score: number;        // 0-1 from fairness audit
  is_low_confidence: boolean;    // < 0.65 threshold trigger
  safety_calibrated: boolean;    // Safety path taken
  fitzpatrick_type: FitzpatrickType | null;
}
```

## 3. Key Tasks

### 3.1 Data & Metrics
- [x] AgentDB records `caseMetadata: {skinToneEst, method, confidence}`
- [ ] Add nightly batch job (client-run cron via service worker) to compute historical TPR/FPR per group
- [ ] Compute moving averages for real-time fairness stats

### 3.2 Algorithmic Improvements
- [ ] Fairness-aware thresholding in `Risk-Assessment-Agent`
- [ ] Calibration table persisted in AgentDB (per skin-tone threshold overrides)
- [ ] Equalized odds correction using WebLLM/SmolLM2

### 3.3 Safety Interception Flow
```
1. Skin-Tone-Agent returns confidence score
2. If confidence < 0.65:
   - Set is_low_confidence: true
   - GOAP replan selects Safety-Calibration-Agent
   - Lower threshold (0.50) applied
   - Warning UI displayed to user
3. All subsequent agents use safety-calibrated thresholds
```

### 3.4 Human-in-the-Loop
- [ ] Add clinician feedback path in `DiagnosticSummary`
- [ ] Feedback updates AgentDB and triggers `Learning-Agent`
- [ ] Relevance reweighting based on clinician corrections

## 4. Safety Levels
Defined in `Audit-Trail-Agent`:

| Level | Trigger | Action |
|:---|:---|:---|
| LOW | Standard analysis | Continue normal flow |
| MEDIUM | Low confidence | Safety calibration route |
| HIGH | Critical error | Immediate clinician notification |

## 5. TPR/FPR Monitoring

### 5.1 Per-Group Metrics
```typescript
interface GroupMetrics {
  tpr: number;   // True Positive Rate
  fpr: number;   // False Positive Rate
  count: number; // Sample count
}

Record<FitzpatrickType, GroupMetrics>
```

### 5.2 Fairness Dashboard
- Real-time TPR/FPR visualization per Fitzpatrick group
- Gap highlighting when TPR difference > 10%
- Intervention recommendations

## 6. Testing & Validation

### 6.1 Unit Tests
- Fairness computation algorithms
- Threshold override logic
- Disentanglement index calculation

### 6.2 E2E Scenarios
- Simulated biased historical data
- Verify recalibration reduces TPR gap
- Safety interception on low confidence

### 6.3 Test Cases
| Scenario | Input | Expected Output |
|:---|:---|:---|
| High confidence | 0.78 | Standard calibration, proceed |
| Low confidence | 0.42 | Safety calibration, warning UI |
| TPR gap > 10% | Group I vs VI | Fairness alert, flag for review |
| Critical error | "Critical" | Abort pipeline, log incident |

## 7. Observability
- Track `tpr_gap_by_group` metric
- Log `confidence_score` per analysis
- Emit `safety_interception` events
- Dashboard widget in `FairnessDashboard.tsx`

## 8. Implementation Status
- [x] Fitzpatrick type definitions
- [x] Confidence score tracking
- [x] Low confidence flagging
- [x] Safety calibration agent
- [x] Standard calibration agent
- [x] FairDisCo feature extraction
- [x] Fairness validation agent
- [x] Per-group TPR/FPR computation (PARTIAL - `services/agentDB.ts:46-114`)
- [ ] Threshold override table
- [ ] Clinician feedback integration
- [ ] Nightly batch analytics
- [ ] FairnessDashboard UI component

---

*Signed: Fairness & Safety Plan (Updated 2026-01-11)*
