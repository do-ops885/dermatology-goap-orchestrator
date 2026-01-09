# Agent Plan: DevOps-Lead
**Focus:** Build Efficiency, Bundle Size, License Compliance, Code Quality

## 1. Linting & Formatting
**Status:** IMPLEMENTED (via `eslint.config.js`)

### 1.1 Enhanced Static Analysis
- **eslint-plugin-react-hooks:** ✅ Enforced in config.
- **no-console:** ✅ Configured to allow only `warn` and `error`.
- **typescript-eslint:** ✅ Integrated for type safety.

## 2. Bundle Analysis
**Status:** IMPLEMENTED (via `vite.config.ts`)

### 2.1 Chunking Strategy
- **Manual Chunks:**
    - `vendor-ai-core`: `@google/genai`, `agentdb`
    - `vendor-tfjs`: Tensor operations isolated.
    - `vendor-webllm`: Large LLM runtime isolated.
- **Result:** Improved cache hits and parallel loading.

## 3. CI/CD Pipeline (`.github/workflows/main.yml`)
**Status:** PENDING (Waiting for Repo Integration)

### 3.1 Pipeline Stages
1.  **Checkout & Cache:** Standard.
2.  **Lint:** `npm run lint`.
3.  **Unit Tests:** `npm run test` (Vitest).
4.  **Build:** `npm run build`.
5.  **Size Check:** Fail build if main entry chunk exceeds 800kB (adjusted in Vite config).
6.  **License Scan:** Scan dependencies for non-compliant licenses (e.g., AGPL).

## 4. Environment Variables
- `API_KEY`: Google Gemini API Key.
- `VITE_USE_MOCK_MODELS`: Boolean.
