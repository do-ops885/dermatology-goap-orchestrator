# Agent Plan: Clinical Pipeline Details

**Focus:** Complete 16-agent analysis workflow, data flow, and state transitions
**Last Updated:** 2026-01-14

### 0.1 Current Implementation Status (2026-01-14)

| Component           | Status      | Implementation Details                      |
| ------------------- | ----------- | ------------------------------------------- |
| 16-agent workflow   | ✅ COMPLETE | Full GOAP implementation with A\* planner   |
| Execution trace     | ✅ COMPLETE | `services/goap/agent.ts` (144 LOC)          |
| Executor pattern    | ✅ COMPLETE | 20+ executor files in `services/executors/` |
| Confidence routing  | ✅ COMPLETE | Standard vs Safety path implementation      |
| Error handling      | ✅ COMPLETE | Critical/non-critical error handling        |
| Performance budgets | ✅ COMPLETE | 72s total pipeline timeout                  |

## 1. Pipeline Overview

The clinical pipeline is a **16-agent GOAP workflow** that transforms a user-uploaded image into a validated clinical diagnosis with fairness guarantees.

```
User Upload → 16 Agents → Diagnostic Summary (Encrypted, Audited)
```

### 1.1 State Model

```typescript
interface WorldState {
  // Pipeline Flags (boolean)
  image_verified: boolean;
  skin_tone_detected: boolean;
  calibration_complete: boolean;
  image_preprocessed: boolean;
  segmentation_complete: boolean;
  features_extracted: boolean;
  lesions_detected: boolean;
  similarity_searched: boolean;
  risk_assessed: boolean;
  fairness_validated: boolean;
  web_verified: boolean;
  recommendations_generated: boolean;
  learning_updated: boolean;
  data_encrypted: boolean;
  audit_logged: boolean;

  // Metrics (numeric)
  confidence_score: number; // 0-1 from skin tone detection
  fairness_score: number; // 0-1 from fairness audit
  fitzpatrick_type: FitzpatrickType | null;
  is_low_confidence: boolean; // Trigger safety path
  safety_calibrated: boolean; // Safety path taken
}
```

## 2. Agent Sequence & Data Flow

### Stage 1: Verification & Detection

#### 1.1 Image-Verification-Agent

| Property          | Value                                  |
| :---------------- | :------------------------------------- |
| **Cost**          | 1                                      |
| **Preconditions** | None                                   |
| **Effects**       | `image_verified: true`                 |
| **Inputs**        | Raw File                               |
| **Outputs**       | SHA-256 hash, validation status        |
| **Logic**         | Magic bytes validation (JPEG/PNG/WebP) |

#### 1.2 Skin-Tone-Detection-Agent

| Property          | Value                                                                             |
| :---------------- | :-------------------------------------------------------------------------------- |
| **Cost**          | 2                                                                                 |
| **Preconditions** | `image_verified: true`                                                            |
| **Effects**       | `skin_tone_detected`, `fitzpatrick_type`, `confidence_score`, `is_low_confidence` |
| **Inputs**        | Optimized image, GoogleGenAI client                                               |
| **Outputs**       | Fitzpatrick type (I-VI), confidence (0-1)                                         |
| **Logic**         | Gemini 2.5 Flash classification                                                   |
| **Safety**        | If confidence < 0.65, sets `is_low_confidence: true`                              |

#### 1.3 Standard-Calibration-Agent

| Property          | Value                                                    |
| :---------------- | :------------------------------------------------------- |
| **Cost**          | 1                                                        |
| **Preconditions** | `skin_tone_detected: true`, `is_low_confidence: false`   |
| **Effects**       | `calibration_complete: true`, `safety_calibrated: false` |
| **Logic**         | Apply standard threshold (0.65)                          |

#### 1.4 Safety-Calibration-Agent

| Property          | Value                                                   |
| :---------------- | :------------------------------------------------------ |
| **Cost**          | 1                                                       |
| **Preconditions** | `skin_tone_detected: true`, `is_low_confidence: true`   |
| **Effects**       | `calibration_complete: true`, `safety_calibrated: true` |
| **Logic**         | Apply conservative threshold (0.50), display warning UI |

### Stage 2: Preprocessing & Segmentation

#### 2.1 Image-Preprocessing-Agent

| Property          | Value                                     |
| :---------------- | :---------------------------------------- |
| **Cost**          | 2                                         |
| **Preconditions** | `calibration_complete: true`              |
| **Effects**       | `image_preprocessed: true`                |
| **Logic**         | Melanin-preserving histogram equalization |

#### 2.2 Segmentation-Agent

| Property          | Value                                            |
| :---------------- | :----------------------------------------------- |
| **Cost**          | 5                                                |
| **Preconditions** | `image_preprocessed: true`                       |
| **Effects**       | `segmentation_complete: true`                    |
| **Logic**         | Isolate skin regions using calibrated thresholds |

### Stage 3: Feature Extraction & Detection

#### 3.1 Feature-Extraction-Agent

| Property          | Value                                   |
| :---------------- | :-------------------------------------- |
| **Cost**          | 8                                       |
| **Preconditions** | `segmentation_complete: true`           |
| **Effects**       | `features_extracted: true`              |
| **Logic**         | MobileNetV2 + FairDisCo disentanglement |
| **Outputs**       | Bias score, disentanglement index       |

#### 3.2 Lesion-Detection-Agent

| Property          | Value                                              |
| :---------------- | :------------------------------------------------- |
| **Cost**          | 10                                                 |
| **Preconditions** | `features_extracted: true`                         |
| **Effects**       | `lesions_detected: true`                           |
| **Inputs**        | Preprocessed image, VisionSpecialist               |
| **Outputs**       | Classification results (HAM10000 classes), heatmap |
| **Logic**         | TF.js MobileNetV3 inference                        |

### Stage 4: Analysis & Risk

#### 4.1 Similarity-Search-Agent

| Property          | Value                          |
| :---------------- | :----------------------------- |
| **Cost**          | 1                              |
| **Preconditions** | `lesions_detected: true`       |
| **Effects**       | `similarity_searched: true`    |
| **Inputs**        | Current case embeddings        |
| **Outputs**       | 10 similar historical cases    |
| **Logic**         | AgentDB vector store RAG query |

#### 4.2 Risk-Assessment-Agent

| Property          | Value                                        |
| :---------------- | :------------------------------------------- |
| **Cost**          | 3                                            |
| **Preconditions** | `similarity_searched: true`                  |
| **Effects**       | `risk_assessed: true`                        |
| **Logic**         | Equalized odds correction via WebLLM/SmolLM2 |

#### 4.3 Fairness-Audit-Agent

| Property          | Value                                            |
| :---------------- | :----------------------------------------------- |
| **Cost**          | 2                                                |
| **Preconditions** | `risk_assessed: true`                            |
| **Effects**       | `fairness_validated: true`                       |
| **Logic**         | TPR/FPR gap validation across Fitzpatrick groups |
| **Outputs**       | `fairness_score`                                 |

### Stage 5: Verification & Recommendations

#### 5.1 Web-Verification-Agent

| Property          | Value                              |
| :---------------- | :--------------------------------- |
| **Cost**          | 4                                  |
| **Preconditions** | `fairness_validated: true`         |
| **Effects**       | `web_verified: true`               |
| **Inputs**        | Preliminary diagnosis              |
| **Outputs**       | Verified sources, web summary      |
| **Logic**         | Google Search grounding via Gemini |

#### 5.2 Recommendation-Agent

| Property          | Value                                         |
| :---------------- | :-------------------------------------------- |
| **Cost**          | 4                                             |
| **Preconditions** | `web_verified: true`                          |
| **Effects**       | `recommendations_generated: true`             |
| **Outputs**       | Clinical advice (max 25 words)                |
| **Logic**         | WebLLM/Gemini synthesis, skin-tone calibrated |

### Stage 6: Learning & Privacy

#### 6.1 Learning-Agent

| Property          | Value                               |
| :---------------- | :---------------------------------- |
| **Cost**          | 2                                   |
| **Preconditions** | `recommendations_generated: true`   |
| **Effects**       | `learning_updated: true`            |
| **Logic**         | Update AgentDB with bias monitoring |

#### 6.2 Privacy-Encryption-Agent

| Property          | Value                                     |
| :---------------- | :---------------------------------------- |
| **Cost**          | 2                                         |
| **Preconditions** | `learning_updated: true`                  |
| **Effects**       | `data_encrypted: true`                    |
| **Logic**         | AES-256-GCM encryption with ephemeral key |

#### 6.3 Audit-Trail-Agent

| Property          | Value                           |
| :---------------- | :------------------------------ |
| **Cost**          | 1                               |
| **Preconditions** | `data_encrypted: true`          |
| **Effects**       | `audit_logged: true`            |
| **Logic**         | SHA-256 Merkle proof to AgentDB |

## 3. Confidence-Driven Routing

### 3.1 Standard Path (High Confidence)

```
confidence_score ≥ 0.65
  → Standard-Calibration-Agent (threshold: 0.65)
  → Normal preprocessing
  → Standard fairness validation
```

### 3.2 Safety Path (Low Confidence)

```
confidence_score < 0.65
  → Safety-Calibration-Agent (threshold: 0.50)
  → Warning UI displayed
  → Conservative fairness margins
  → Additional review triggers
```

### 3.3 Dynamic Replanning

When `is_low_confidence` is set mid-pipeline:

1. Current agent completes
2. `shouldReplan: true` returned
3. GOAP planner recalculates path
4. Safety path automatically selected
5. Execution continues from new state

## 4. Error Handling

### 4.1 Critical Errors

- Precondition violations → Abort pipeline
- Model unavailable → Abort with error message
- Error message contains "Critical" → Full abort

### 4.2 Non-Critical Errors

- Single agent fails → Mark `skipped`, continue
- Timeout → Mark `skipped`, continue
- Network error → Retry once, then skip

### 4.3 Graceful Degradation

| Failure                  | Behavior                  |
| :----------------------- | :------------------------ |
| WebGPU unavailable       | Fallback to WebGL/CPU     |
| Gemini API failure       | Use local WebLLM fallback |
| Vision model unavailable | Abort (critical)          |
| AgentDB unavailable      | Continue without RAG      |

## 5. Data Flow Example

```
Input: { file: File, goal: { audit_logged: true } }

1. Image-Verification-Agent
   → { image_verified: true, fileHash: "abc123..." }

2. Skin-Tone-Detection-Agent
   → { skin_tone_detected: true, fitzpatrick_type: "III", confidence_score: 0.78, is_low_confidence: false }

3. Standard-Calibration-Agent
   → { calibration_complete: true, safety_calibrated: false }

4. Image-Preprocessing-Agent
   → { image_preprocessed: true }

5. Segmentation-Agent
   → { segmentation_complete: true }

6. Feature-Extraction-Agent
   → { features_extracted: true, bias_score: 0.12, disentanglement_index: 0.85 }

7. Lesion-Detection-Agent
   → { lesions_detected: true, classifications: [...] }

8. Similarity-Search-Agent
   → { similarity_searched: true, similarCases: [...] }

9. Risk-Assessment-Agent
   → { risk_assessed: true, riskScore: 0.34 }

10. Fairness-Audit-Agent
    → { fairness_validated: true, fairness_score: 0.92 }

11. Web-Verification-Agent
    → { web_verified: true, sources: [...] }

12. Recommendation-Agent
    → { recommendations_generated: true, advice: "..." }

13. Learning-Agent
    → { learning_updated: true }

14. Privacy-Encryption-Agent
    → { data_encrypted: true, ciphertext: "..." }

15. Audit-Trail-Agent
    → { audit_logged: true }

Output: ExecutionTrace with all agents, final encrypted state
```

## 6. Performance Budgets

| Stage              | Max Duration | Agent                     |
| :----------------- | -----------: | :------------------------ |
| Verification       |           2s | Image-Verification-Agent  |
| Detection          |           5s | Skin-Tone-Detection-Agent |
| Calibration        |           1s | Standard/Safety           |
| Preprocessing      |           3s | Image-Preprocessing-Agent |
| Segmentation       |           5s | Segmentation-Agent        |
| Feature Extraction |          10s | Feature-Extraction-Agent  |
| Lesion Detection   |          15s | Lesion-Detection-Agent    |
| Similarity Search  |           2s | Similarity-Search-Agent   |
| Risk Assessment    |           5s | Risk-Assessment-Agent     |
| Fairness Audit     |           3s | Fairness-Audit-Agent      |
| Web Verification   |          10s | Web-Verification-Agent    |
| Recommendations    |           5s | Recommendation-Agent      |
| Learning           |           3s | Learning-Agent            |
| Encryption         |           2s | Privacy-Encryption-Agent  |
| Audit              |           1s | Audit-Trail-Agent         |

**Total Budget:** ~72 seconds (worst case)

## 7. Observability

### 7.1 Per-Agent Metrics

- Start/end timestamps
- Duration
- Status (completed/skipped/failed)
- Metadata (confidence scores, classifications)

### 7.2 Pipeline Metrics

- Total execution time
- Replan count
- Safety interception count
- Final state completeness

### 7.3 Trace Events

```
plan_start → agent_start → agent_end → ... → plan_end
            ↳ replan_triggered → replan_complete
```

---

_Signed: Clinical Pipeline Plan (Created 2025-01-10)_
