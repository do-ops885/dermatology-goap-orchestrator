# AGENTS.md

**For AI Coding Agents** — A machine-readable guide to working with this codebase.

**Last Updated:** 2026-02-02

---

## 1. Quick Start

| Command               | Purpose                                        |
| :-------------------- | :--------------------------------------------- |
| `npm run dev`         | Start Vite dev server (http://localhost:5173)  |
| `npm run build`       | Production bundle with manual chunks           |
| `npm run preview`     | Preview production build                       |
| `npm run lint`        | ESLint v9 + TypeScript strict + security rules |
| `npm run test`        | Vitest suite (jsdom)                           |
| `npx playwright test` | E2E tests (Playwright)                         |

**Test Locations:**

- Unit tests: `tests/unit/*.test.ts` (Vitest + @testing-library/react)
- E2E tests: `tests/e2e/*.spec.ts` (Playwright)
- Setup: `tests/setup.ts` (polyfills crypto, ResizeObserver)

---

## 2. Core Principles

### 2.1 Type Safety (Non-Negotiable)

- **`no-explicit-any` is an error** — Use defined interfaces in `types.ts` or `unknown`
- **Enable `--strict` by default** — TypeScript 5.8+ sets this automatically
- **Type imports** — Use `import type { ... }` for type-only imports

### 2.2 Code Organization

- **Max 500 LOC per file** — Refactor to `services/executors/` if exceeded
- **Single responsibility** — One purpose per file (crypto, vision, router, logger)
- **Business logic in services/** — Not in React components
- **Shared types in types.ts** — Centralized type definitions

### 2.3 React 19 Patterns

- **Functional components only** — No class components
- **Hooks with dependencies** — Always include all reactive dependencies
- **Component structure** — State → Refs → Effects → Handlers → Return
- **Cleanup in useEffect** — Remove listeners, dispose tensors

---

## 3. Runtime Agents (Clinical Pipeline)

| Agent ID                       | Role                               | Tooling             | Precondition                |
| :----------------------------- | :--------------------------------- | :------------------ | :-------------------------- |
| **GOAP-Agent**                 | Central orchestrator               | `services/goap.ts`  | None                        |
| **Image-Verification-Agent**   | Validates file signatures, SHA-256 | `crypto.subtle`     | None                        |
| **Skin-Tone-Detection-Agent**  | Fitzpatrick/Monk classification    | Gemini 3 Flash      | `image_verified`            |
| **Standard-Calibration-Agent** | High-confidence thresholds (0.65)  | Logic               | `skin_tone_detected`        |
| **Safety-Calibration-Agent**   | Conservative thresholds (0.50)     | Logic               | `is_low_confidence`         |
| **Image-Preprocessing-Agent**  | Histogram normalization            | Canvas API          | `calibration_complete`      |
| **Segmentation-Agent**         | Skin region isolation              | Logic               | `image_preprocessed`        |
| **Feature-Extraction-Agent**   | Vector embeddings                  | Gemini 3 Flash      | `segmentation_complete`     |
| **Lesion-Detection-Agent**     | Melanoma, BCC classification       | TF.js (MobileNetV3) | `features_extracted`        |
| **Similarity-Search-Agent**    | RAG: 10 similar cases              | AgentDB             | `lesions_detected`          |
| **Risk-Assessment-Agent**      | Risk profile synthesis             | WebLLM (SmolLM2)    | `similarity_searched`       |
| **Fairness-Audit-Agent**       | TPR validation across demographics | AgentDB             | `risk_assessed`             |
| **Web-Verification-Agent**     | Medical literature search          | Google Search       | `fairness_validated`        |
| **Recommendation-Agent**       | Clinical advice (max 25 words)     | WebLLM / Gemini     | `web_verified`              |
| **Learning-Agent**             | Vector store update                | AgentDB             | `recommendations_generated` |
| **Privacy-Encryption-Agent**   | AES-256-GCM encryption             | `crypto.subtle`     | `learning_updated`          |
| **Audit-Trail-Agent**          | Transaction hash to ledger         | AgentDB             | `data_encrypted`            |

---

## 4. Development Agents (CI/CD Personas)

| Persona                  | Plan File                               | Mandate                              | Trigger                |
| :----------------------- | :-------------------------------------- | :----------------------------------- | :--------------------- |
| 🛡️ Sec-Ops               | `plans/04_security_audit.md`            | CSP, sanitization, encryption, GDPR  | Architecture changes   |
| 🧪 QA-Specialist         | `plans/01_testing_strategy.md`          | >80% coverage, E2E safety scenarios  | Codebase stability     |
| 🧠 ML-Edge-Engineer      | `plans/02_edge_ml_implementation.md`    | TF.js WebGPU, WebLLM offline, memory | Performance regression |
| 🏗️ DevOps-Lead           | `plans/03_devops_workflow.md`           | CI/CD, linting, release tagging      | Build failures         |
| 🎨 UX-A11y-Lead          | `plans/05_ux_pwa_strategy.md`           | WCAG 2.1, Dark Mode, PWA             | UI component changes   |
| ⚙️ Reliability-Architect | `plans/06_reliability_observability.md` | Error boundaries, logging, telemetry | Crash reports          |
| 📝 Documentation-Manager | `plans/18_developer_quick_reference.md` | Consistent docs structure            | New .md files          |

---

## 5. AI Safety Protocols

1. **Confidence Score Required** — All visual inference must return (0-1)
2. **Fail-Safe Routing** — If `is_low_confidence` is true, MUST route through `Safety-Calibration-Agent`
3. **Human-in-the-Loop** — `DiagnosticSummary` must flag AI vs. grounded sources

---

## 6. Memory Management

1. **Tensor Cleanup** — Use `tf.tidy()` or `.dispose()` for all TF.js operations
2. **Engine Unload** — Heavy models (WebLLM) must expose `unload()` method
3. **Event Listeners** — Remove in `useEffect` cleanup functions

---

## 7. Error Handling

1. **Graceful Degradation** — Non-critical agents return "skipped" status
2. **Try-Catch All Async** — Wrap all async operations
3. **Structured Logging** — Use `services/logger.ts` with JSON format

---

## 8. Code Style Guidelines

### 8.1 Naming Conventions

| Type                | Convention             | Example                     |
| :------------------ | :--------------------- | :-------------------------- |
| Variables/Functions | `camelCase`            | `calculateImageHash`        |
| Types/Interfaces    | `PascalCase`           | `WorldState`, `AgentAction` |
| Constants           | `UPPER_SNAKE_CASE`     | `INITIAL_STATE`, `MAX_SIZE` |
| Components          | `PascalCase`           | `DiagnosticSummary`         |
| Private Methods     | `_prefix` or `private` | `_sanitize`                 |

### 8.2 Import Order

1. External libraries
2. Internal modules (`@/...`)
3. Relative paths

---

## 10. GitHub Actions Verification

### 10.1 CI/CD Workflow Status

All PRs require passing GitHub Actions before merge:

| Workflow         | Status                                                             |
| :--------------- | :----------------------------------------------------------------- |
| **CI**           | ✓ Formatting, Lint & Type Check, Unit Tests, Build, Security Audit |
| **Code Quality** | ✓ SonarCloud Scan, Code Complexity                                 |
| **Security**     | ✓ CodeQL, Dependency Review, NPM Audit                             |
| **E2E Tests**    | ✓ Playwright E2E Tests                                             |

### 10.2 PR #50 Resolution (ESLint v9 Upgrade)

| Issue                            | Resolution                                                                     |
| :------------------------------- | :----------------------------------------------------------------------------- |
| **SonarCloud Scan FAILURE**      | ESLint v9 flat config format was already correct; no config changes needed     |
| **Playwright E2E Tests FAILURE** | Removed unused `eslint-disable` directives flagged by ESLint v9 stricter rules |

### 10.3 ESLint v9 Rules

- **No unused eslint-disable** — ESLint v9 warns on unused disable directives
- **No explicit `any`** — Use `unknown` or proper types (see Section 2.1)
- **Run `npm run lint` before tests** — Never skip lint step

---

## 11. Verification Checklist

Before committing any changes:

1. Run `npm run lint` — Must pass with no errors
2. Run `npm run test` — At least 1 test must pass
3. Push to remote and verify all GitHub Actions pass

## 12. Documentation Organization

All documentation files **MUST** be created in `plans/`:

- `*summary*.md` — Summary documents
- `*analyze*.md`, `*analysis*.md` — Analysis documents
- `*plan*.md` — Plan documents
- `*strategy*.md` — Strategy documents
- `*checklist*.md` — Checklist documents
- `*reference*.md` — Reference documents

**Do not** create .md files in root or other locations.
