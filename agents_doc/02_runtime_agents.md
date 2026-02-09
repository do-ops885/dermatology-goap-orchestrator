# Runtime Agents (Clinical Pipeline)

Source of truth:

- `services/goap.ts`
- `services/goap/registry.ts`
- `services/executors/*.ts`

## Pipeline Table

| Agent ID                       | Role                                    | Tooling / Implementation                        | Preconditions                                      | Executor File                                     |
| :----------------------------- | :-------------------------------------- | :---------------------------------------------- | :------------------------------------------------- | :------------------------------------------------ |
| **GOAP-Agent**                 | Planner and orchestrator                | A\* search planner                              | None                                               | `services/goap.ts`                                |
| **Image-Verification-Agent**   | Basic integrity check and hash metadata | SHA-256 hash; metadata reports signature status | None                                               | `services/executors/imageVerificationExecutor.ts` |
| **Skin-Tone-Detection-Agent**  | Fitzpatrick classification + confidence | Gemini 3 Flash preview with JSON response       | `image_verified`                                   | `services/executors/skinToneDetectionExecutor.ts` |
| **Standard-Calibration-Agent** | High-confidence thresholds (0.65)       | Logic thresholds                                | `skin_tone_detected` and `is_low_confidence=false` | `services/executors/calibrationExecutor.ts`       |
| **Safety-Calibration-Agent**   | Conservative thresholds (0.50)          | Logic thresholds                                | `skin_tone_detected` and `is_low_confidence=true`  | `services/executors/calibrationExecutor.ts`       |
| **Image-Preprocessing-Agent**  | Histogram normalization                 | Melanin-preserving normalization                | `calibration_complete`                             | `services/executors/preprocessingExecutor.ts`     |
| **Segmentation-Agent**         | Skin region isolation                   | Threshold logic                                 | `image_preprocessed`                               | `services/executors/segmentationExecutor.ts`      |
| **Feature-Extraction-Agent**   | Bias and disentanglement signals        | Gemini 3 Flash preview with JSON response       | `segmentation_complete`                            | `services/executors/featureExtractionExecutor.ts` |
| **Lesion-Detection-Agent**     | Melanoma/BCC/SCC classification         | TF.js MobileNetV3 via `visionSpecialist`        | `features_extracted`                               | `services/executors/lesionDetectionExecutor.ts`   |
| **Similarity-Search-Agent**    | Retrieve 10 similar cases               | AgentDB search with synthetic embedding         | `lesions_detected`                                 | `services/executors/similaritySearchExecutor.ts`  |
| **Risk-Assessment-Agent**      | Risk profile synthesis                  | WebLLM SmolLM2-1.7B or rule-based fallback      | `similarity_searched`                              | `services/executors/riskAssessmentExecutor.ts`    |
| **Fairness-Audit-Agent**       | TPR/FPR validation                      | AgentDB fairness checks                         | `risk_assessed`                                    | `services/executors/fairnessAuditExecutor.ts`     |
| **Web-Verification-Agent**     | Medical literature grounding            | Gemini 3 Flash preview + Google Search tool     | `fairness_validated`                               | `services/executors/webVerificationExecutor.ts`   |
| **Recommendation-Agent**       | Clinical advice (max 25 words)          | WebLLM SmolLM2-1.7B or Gemini 3 Flash fallback  | `web_verified`                                     | `services/executors/recommendationExecutor.ts`    |
| **Learning-Agent**             | Vector store updates                    | AgentDB pattern storage                         | `recommendations_generated`                        | `services/executors/learningExecutor.ts`          |
| **Privacy-Encryption-Agent**   | AES-GCM payload encryption              | `CryptoService` AES-GCM-256 + AgentDB event     | `learning_updated`                                 | `services/executors/privacyEncryptionExecutor.ts` |
| **Audit-Trail-Agent**          | Hash-chain audit trail                  | SHA-256 hash chain + AgentDB audit log          | `data_encrypted`                                   | `services/executors/auditTrailExecutor.ts`        |

## Behavioral Notes

- `Skin-Tone-Detection-Agent` sets `is_low_confidence` and may trigger replanning.
- `Web-Verification-Agent` skips when `privacyMode` is on or `navigator.onLine` is false.
- `Recommendation-Agent` attempts local LLM first and falls back to Gemini 3 Flash if online.
- `Audit-Trail-Agent` raises alerts on high-risk results and logs a chained hash in AgentDB.
