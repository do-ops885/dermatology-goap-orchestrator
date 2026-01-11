# Agent Registry & Directives

Current year: 2026

## 1. System Architecture: GOAP Orchestrator
This repository implements a **Goal-Oriented Action Planning (GOAP)** system. Unlike traditional procedural code, the logic is driven by autonomous agents satisfying specific state transitions to reach a goal (e.g., `{ audit_logged: true }`).

### 1.1 Core Directives
*   **Atomic Responsibility**: Each agent performs exactly one semantic task.
*   **State-Driven**: Agents operate based on `WorldState` preconditions and effects.
*   **Source Limits**: To ensure maintainability and agent readability, **no source file shall exceed 500 Lines of Code (LOC)**. Refactor immediately if this limit is breached.

---

## 2. Runtime Agents (Clinical Pipeline)
These agents execute within the user's browser, orchestrated by the `GOAP-Agent` (implemented in `services/goap.ts`).

| Agent ID | Role | Tooling | Precondition |
|:---|:---|:---|:---|
| **GOAP-Agent** | Central orchestrator (plan & execution). See `plans/07_goap_agent_orchestration.md`. | `services/goap.ts` | None |
| **Image-Verification-Agent** | Validates file signatures (Magic Bytes) & calculates SHA-256 hash. | `crypto.subtle` | None |
| **Skin-Tone-Detection-Agent** | Classifies Fitzpatrick/Monk scale & outputs confidence score. | Gemini 3 Flash | `image_verified` |
| **Standard-Calibration-Agent** | Sets standard decision thresholds (0.65) for high-confidence inputs. | Logic | `skin_tone_detected` |
| **Safety-Calibration-Agent** | **[Fallback]** Enforces conservative thresholds (0.50) if detection confidence < 65%. | Logic | `is_low_confidence` |
| **Image-Preprocessing-Agent** | Normalizes histograms to preserve melanin features. | Canvas API | `calibration_complete` |
| **Segmentation-Agent** | Isolates skin regions from background clutter. | Logic | `image_preprocessed` |
| **Feature-Extraction-Agent** | Extracts vector embeddings for fairness analysis. | Gemini 3 Flash | `segmentation_complete` |
| **Lesion-Detection-Agent** | Classifies skin conditions (e.g., Melanoma, BCC). | TF.js (MobileNetV3) | `features_extracted` |
| **Similarity-Search-Agent** | RAG: Retrieves 10 similar historical cases from Vector DB. | AgentDB | `lesions_detected` |
| **Risk-Assessment-Agent** | Synthesizes lesion data + history into a risk profile. | WebLLM (SmolLM2) | `similarity_searched` |
| **Fairness-Audit-Agent** | Validates True Positive Rate (TPR) gaps across demographics. | AgentDB | `risk_assessed` |
| **Web-Verification-Agent** | Grounds diagnosis via live medical literature search. | Google Search Tool | `fairness_validated` |
| **Recommendation-Agent** | Generates actionable clinical advice (max 25 words). | WebLLM / Gemini | `web_verified` |
| **Learning-Agent** | Updates the local vector store with the new case pattern. | AgentDB | `recommendations_generated` |
| **Privacy-Encryption-Agent** | Encrypts patient payload using AES-256-GCM. | `crypto.subtle` | `learning_updated` |
| **Audit-Trail-Agent** | Commits the transaction hash to the immutable ledger. | AgentDB | `data_encrypted` |

---

## 3. Development Agents (CI/CD Personas)
These meta-agents define the SDLC process, represented by plan files in `plans/`.

### 🛡️ Sec-Ops
*   **Plan:** `04_security_audit.md`
*   **Mandate:** Enforce CSP, sanitization, encryption, and GDPR compliance.
*   **Trigger:** Architecture changes or new dependencies.

### 🧪 QA-Specialist
*   **Plan:** `01_testing_strategy.md`
*   **Mandate:** Maintain >80% coverage. Write E2E scenarios for "Safety Interception".
*   **Trigger:** Codebase stability.

### 🧠 ML-Edge-Engineer
*   **Plan:** `02_edge_ml_implementation.md`
*   **Mandate:** Optimize TF.js WebGPU backend, WebLLM offline inference, and memory safety.
*   **Trigger:** Performance regression or model updates.

### 🏗️ DevOps-Lead
*   **Plan:** `03_devops_workflow.md`
*   **Mandate:** CI/CD pipelines, Linting (Security/SonarJS), and release tagging.
*   **Trigger:** Build failures.

### 🎨 UX-A11y-Lead
*   **Plan:** `05_ux_pwa_strategy.md`
*   **Mandate:** WCAG 2.1 compliance, Dark Mode, and PWA installability.
*   **Trigger:** UI component changes.

### ⚙️ Reliability-Architect
*   **Plan:** `06_reliability_observability.md`
*   **Mandate:** Global Error Boundaries, Structured Logging, Telemetry.
*   **Trigger:** Crash reports or unhandled exceptions.

---

## 4. Operational Constraints & Best Practices

### 4.1 Code Quality
1.  **Strict Types**: `no-explicit-any` warning is enabled. Use defined interfaces in `types.ts`.
2.  **Modular Services**: Business logic lives in `services/`, not React components.
3.  **File Size**: **MAX 500 LINES**. If `hooks/useClinicalAnalysis.ts` grows too large, refactor agent executors into `services/executors/`.

### 4.2 AI Safety Protocols
1.  **Confidence Check**: All visual inference must return a confidence score.
2.  **Fail-Safe**: If `is_low_confidence` is true, the Planner **MUST** route through `Safety-Calibration-Agent`.
3.  **Human-in-the-Loop**: The `DiagnosticSummary` must clearly flag AI-generated reasoning vs. grounded web sources.

### 4.3 Memory Management (Anti-Leak)
1.  **Tensor Cleanup**: All TF.js operations must use `tf.tidy()` or explicitly call `.dispose()`.
2.  **Engine Unload**: Heavy ML engines (WebLLM) must expose an `unload()` method and be cleaned up on component unmount.
3.  **Event Listeners**: Always remove event listeners in `useEffect` cleanup functions.

### 4.4 Global Error Handling
1.  **Graceful Degradation**: Agents must catch internal errors. If a non-critical agent fails (e.g., `Web-Verification`), it should return a "skipped" status rather than crashing the whole orchestrator.
2.  **Structured Logs**: Use the standardized JSON logging format defined in `plans/06_reliability_observability.md`.

---

## 5. Build, Lint, Test Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server (http://localhost:5173) |
| `npm run build` | Production bundle with manual chunks |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint on all TS/TSX/JS/JSX files |
| `npm run test` | Run Vitest suite (jsdom, non-threaded) |
| `npm run test -- path/to/test.test.ts` | Run single test file |
| `npx playwright test` | Run E2E tests (Playwright) |
| `npx playwright test --ui` | Run E2E with UI mode |
| `npm run agentdb:init` | Initialize AgentDB vector store |

**Test Locations:**
- Unit tests: `tests/unit/*.test.ts` - use Vitest + @testing-library/react
- E2E tests: `tests/e2e/*.spec.ts` - use Playwright
- Test setup: `tests/setup.ts` (polyfills crypto, ResizeObserver, etc.)

---

## 6. Code Style Guidelines

### 6.1 TypeScript & Imports
- **Strict Mode**: `no-explicit-any` warning enabled - use interfaces from `types.ts`
- **Import Order**: External libs → internal modules (`@/...`) → relative paths
- **Type Imports**: Use `import type { ... }` for type-only imports
- **File Extensions**: `.ts` for logic, `.tsx` for React components

### 6.2 Naming Conventions
- **Variables/Functions**: `camelCase` (e.g., `calculateImageHash`)
- **Types/Interfaces**: `PascalCase` (e.g., `WorldState`, `AgentAction`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `INITIAL_STATE`, `MAX_SIZE`)
- **Components**: `PascalCase` (e.g., `DiagnosticSummary`, `AnalysisIntake`)
- **Private Methods**: `private` prefix or `_` prefix (e.g., `_sanitize`)

### 6.3 React & Hooks
- **Component Structure**: State → Refs → Effects → Handlers → Return
- **useEffect Cleanup**: Always remove event listeners, dispose TF.js tensors
- **Custom Hooks**: Prefix with `use` (e.g., `useClinicalAnalysis`)
- **Dependencies Array**: Always include all reactive dependencies

### 6.4 Error Handling
- **Try-Catch**: Wrap all async operations in try-catch blocks
- **Logging**: Use `Logger.error/warn/info/debug` from `services/logger.ts`
- **User Messages**: Provide user-friendly error messages, log technical details separately
- **Graceful Degradation**: Return "skipped" status for non-critical failures

### 6.5 Code Organization
- **Max 500 LOC** per file - refactor to `services/executors/` if exceeded
- **Business Logic**: Lives in `services/`, not React components
- **Types**: Shared interfaces in `types.ts`
- **Services**: Single responsibility per file (crypto, vision, router, logger)

### 6.6 AI/ML Safety
- **Confidence Scores**: All inference must return confidence (0-1)
- **Tensor Cleanup**: Use `tf.tidy()` or `.dispose()` for all TF.js operations
- **Heavy Models**: Lazy load on user interaction, expose `unload()` method
- **Privacy Mode**: Always provide offline/local fallback for cloud services
