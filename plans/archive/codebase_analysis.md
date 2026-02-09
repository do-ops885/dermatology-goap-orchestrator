# Codebase Analysis: Dermatology AI Orchestrator

**Generated:** 2025-01-10
**Updated:** 2025-01-10 (Comprehensive Deep Dive)

## 1. Executive Summary

The **Dermatology GOAP Orchestrator** is a production-grade Progressive Web App (PWA) for clinical skin analysis. It leverages a **Goal-Oriented Action Planning (GOAP)** architecture to orchestrate a hybrid team of 16 AI agents (Cloud + Edge) with comprehensive safety and fairness mechanisms.

### Key Metrics

- **Total Lines of Code:** ~2,500 (primary services)
- **Pipeline Agents:** 16
- **Test Coverage:** Unit + E2E + Component
- **AI Stack:** TF.js (WebGPU), WebLLM (SmolLM2), AgentDB

---

## 2. Core Architecture: GOAP Orchestrator

### 2.1 Planning System

- **File:** `services/goap.ts` (329 LOC)
- **Algorithm:** A\* Search with backward-chaining heuristic
- **Safety:** 5000 iteration cap prevents infinite loops
- **State Keying:** Deterministic string representation for closed-set tracking

### 2.2 Execution Orchestrator

- **File:** `services/goap/agent.ts` (145 LOC)
- **Class:** `GoapAgent`
- **Responsibilities:** Plan execution, timeout enforcement, dynamic replanning, trace collection
- **Execution Trace:** `{runId, startTime, agents: [...], finalWorldState}`

### 2.3 Agent Registry (AVAILABLE_ACTIONS)

16 agents with preconditions, effects, and costs defined in `services/goap.ts` lines 3-132.

---

## 3. Key Technical Components

### 3.1 Hybrid AI Engine

#### Vision (Edge)

- **File:** `services/vision.ts` (185 LOC)
- **Class:** `VisionSpecialist` (Singleton)
- **Technology:** TensorFlow.js 4.17.0 (WebGPU/WebGL/CPU)
- **Model:** MobileNetV2 GraphModel
- **Classes:** HAM10000 taxonomy (7 classes)
- **Features:** Classification, Saliency-based Grad-CAM heatmaps

#### LLM (Edge)

- **File:** `services/agentDB.ts` (291 LOC)
- **Class:** `LocalLLMService`
- **Technology:** WebLLM (SmolLM2-1.7B-Instruct)
- **Usage:** Offline risk assessment, recommendations

#### Reasoning (Cloud)

- **Technology:** Google GenAI (`@google/genai` 1.34.0)
- **Model:** Gemini 2.5 Flash
- **Usage:** Skin tone detection, web verification, grounding

### 3.2 Memory & Fairness

#### AgentDB Vector Store

- **File:** `services/agentDB.ts`
- **Components:**
  - `ReasoningBank`: Vector store for patterns
  - `EmbeddingService`: @xenova/transformers
  - `LocalLLMService`: WebLLM integration
- **Data:** Audit logs, historical cases, fairness metrics

#### Fairness Dashboard

- **File:** `components/FairnessDashboard.tsx`
- **Metrics:** TPR/FPR per Fitzpatrick group (I-VI)
- **Real-time:** Live stats from AgentDB

### 3.3 Security & Privacy

#### Input Validation

- Magic byte validation (JPEG/PNG/WebP)
- SHA-256 image hashing
- File size limits

#### Encryption

- **File:** `services/crypto.ts`
- **Algorithm:** AES-256-GCM
- **Keys:** Ephemeral, never persisted

#### Audit Trail

- SHA-256 Merkle proof to AgentDB
- Complete execution trace preservation

---

## 4. Safety Mechanisms

### 4.1 Confidence-Driven Routing

| Level | Threshold | Agent                      | Action              |
| :---- | :-------: | :------------------------- | :------------------ |
| High  |  ≥ 0.65   | Standard-Calibration-Agent | Standard thresholds |
| Low   |  < 0.65   | Safety-Calibration-Agent   | Conservative (0.50) |

### 4.2 Fairness Validation

- **Fitzpatrick Types:** I, II, III, IV, V, VI
- **FairDisCo:** Bias score, disentanglement index
- **TPR/FPR:** Per-group monitoring and gap detection

### 4.3 Failure Handling

- **Critical:** Contains "Critical" → abort pipeline
- **Non-Critical:** Mark `skipped`, continue execution
- **Timeouts:** 10s default per-agent

---

## 5. Pipeline Flow (16 Agents)

```
[User Upload]
    ↓
1. Image-Verification-Agent (cost: 1)
   Magic bytes, SHA-256 hash
    ↓
2. Skin-Tone-Detection-Agent (cost: 2)
   Fitzpatrick type, confidence score
    ↓
   ├─→ High (≥0.65) → Standard-Calibration-Agent
   └─→ Low (<0.65) → Safety-Calibration-Agent
    ↓
3-4. Calibration Agents (cost: 1 each)
   Set threshold (0.65 or 0.50)
    ↓
5. Image-Preprocessing-Agent (cost: 2)
   Melanin-preserving histogram
    ↓
6. Segmentation-Agent (cost: 5)
   Skin region isolation
    ↓
7. Feature-Extraction-Agent (cost: 8)
   MobileNetV2 + FairDisCo
    ↓
8. Lesion-Detection-Agent (cost: 10)
   TF.js classification, heatmap
    ↓
9. Similarity-Search-Agent (cost: 1)
   RAG: 10 similar cases
    ↓
10. Risk-Assessment-Agent (cost: 3)
   Equalized odds correction
    ↓
11. Fairness-Audit-Agent (cost: 2)
   TPR/FPR validation
    ↓
12. Web-Verification-Agent (cost: 4)
   Google Search grounding
    ↓
13. Recommendation-Agent (cost: 4)
   25-word clinical advice
    ↓
14. Learning-Agent (cost: 2)
   Vector DB update
    ↓
15. Privacy-Encryption-Agent (cost: 2)
   AES-256-GCM
    ↓
16. Audit-Trail-Agent (cost: 1)
   Merkle proof
    ↓
[Diagnostic Summary]
```

---

## 6. File Structure Reference

| File Path                         | Component             |      LOC | Status   |
| :-------------------------------- | :-------------------- | -------: | :------- |
| `services/goap.ts`                | Planner (A\*)         |      329 | Stable   |
| `services/goap/agent.ts`          | Orchestrator          |      145 | Stable   |
| `services/vision.ts`              | Vision Specialist     |      185 | Active   |
| `services/agentDB.ts`             | Vector Store + LLM    |      291 | Active   |
| `services/crypto.ts`              | Encryption            |     ~100 | Stable   |
| `services/logger.ts`              | Logging               |      ~80 | Stable   |
| `services/router.ts`              | Intent Router         |     ~100 | Active   |
| `hooks/useClinicalAnalysis.ts`    | Agent Executors       |      739 | Active   |
| `types.ts`                        | TypeScript Interfaces |      123 | Stable   |
| `tests/unit/goap.test.ts`         | Planner Tests         |      167 | Complete |
| `tests/e2e/clinical-flow.spec.ts` | E2E Scenarios         |      178 | Complete |
| `plans/`                          | Design Documents      | 14 files | Updated  |

---

## 7. Observability

### 7.1 Structured Events

- `plan_start`, `plan_end`
- `agent_start`, `agent_end`
- `replan_triggered`, `replan_complete`
- `agent_failed`, `plan_aborted`

### 7.2 Metrics

- `agent_latency_ms` (per-agent)
- `agent_success_total`
- `agent_failure_total`
- `plan_duration_ms`
- `replan_total`

### 7.3 Performance Budgets

- Total pipeline: < 72 seconds
- Lesion Detection: 15s (most expensive)
- Feature Extraction: 10s

---

## 8. Test Coverage

### Unit Tests

- GOAP Planner: A\*, heuristics, replanning
- GOAP-Agent: Execution, tracing, timeout
- Vision Service: Backend selection, classification
- AgentDB: Vector store, aggregation

### E2E Tests

- Happy Path: Full 16-agent pipeline
- Safety Interception: Low confidence routing
- Security: Magic bytes, file types
- Offline Mode: Local inference fallback
- Memory Leaks: GPU tensor cleanup

### Component Tests

- FairnessDashboard, DiagnosticSummary
- AnalysisIntake, AgentFlow

---

## 9. Plans Updated (2025-01-10)

### Updated Plans

1. `07_goap_agent_orchestration.md` - Detailed algorithm specs
2. `08_fairness_and_safety_improvements.md` - Threshold details
3. `01_testing_strategy.md` - Specific test patterns

### New Plans Created

4. `14_vision_implementation.md` - TF.js/MobileNetV2
5. `15_clinical_pipeline_details.md` - 16-agent workflow
6. `codebase_analysis.md` - This comprehensive document

---

## 10. Current Focus (2025)

- **Optimization:** Caching large model weights
- **Security:** Real AES-GCM payload encryption
- **Testing:** Expanding unit coverage for internal service logic
- **Fairness:** Per-group TPR/FPR computation and monitoring
- **Observability:** Real-time trace visualization

---

_End of Codebase Analysis - 2025-01-10_
