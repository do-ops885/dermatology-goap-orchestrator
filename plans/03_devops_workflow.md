# Agent Plan: DevOps-Lead
**Focus:** Build Efficiency, Bundle Size, License Compliance, Code Quality

## 1. Linting & Formatting
**Status:** IMPLEMENTED (via `eslint.config.js`)

### 1.1 Enhanced Static Analysis
- **eslint-plugin-react-hooks:** ✅ Enforced in config.
- **no-console:** ✅ Configured to allow only `warn` and `error`.
- **typescript-eslint:** ✅ Integrated for type safety.

### 1.2 2025: Enhanced ESLint Configuration
- [ ] **Add `@typescript-eslint/no-explicit-any`**: Enforce strict typing
- [ ] **Add `@typescript-eslint/no-unsafe-assignment`**: Catch unsafe type assignments
- [ ] **Add `@typescript-eslint/no-floating-promises`**: Prevent unhandled promises
- [ ] **Add `react-hooks/exhaustive-deps`**: Catch missing dependencies

## 2. Bundle Analysis & Optimization
**Status:** IMPLEMENTED (via `vite.config.ts`)

### 2.1 Current Chunking Strategy
- **Manual Chunks:**
    - `vendor-react`: React, ReactDOM, Framer Motion
    - `vendor-charts`: Recharts
    - `vendor-ai-core`: Google GenAI, AgentDB, Transformers
    - `vendor-tfjs`: TensorFlow.js + WebGPU backend
    - `vendor-webllm`: WebLLM runtime
    - `vendor-utils`: Lucide, Buffer, Process

### 2.2 2025: Enhanced Code Splitting
- [ ] **Implement Granular Chunking:**
    ```typescript
    manualChunks: (id) => {
      if (id.includes('node_modules')) {
        if (id.includes('@tensorflow')) return 'vendor-tfjs';
        if (id.includes('@google/genai')) return 'vendor-gemini';
        if (id.includes('@mlc-ai/web-llm')) return 'vendor-webllm';
        if (id.includes('framer-motion')) return 'vendor-animations';
        if (id.includes('recharts')) return 'vendor-charts';
        if (id.includes('react')) return 'vendor-react';
        return 'vendor-misc';
      }
    }
    ```

### 2.3 2025: Build Performance Plugins
- [ ] **Add Bundle Visualization:**
    ```typescript
    import { visualizer } from 'rollup-plugin-visualizer';
    plugins: [
      visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true
      })
    ]
    ```
- [ ] **Add Compression:**
    ```typescript
    import viteCompression from 'vite-plugin-compression';
    plugins: [
      viteCompression({ algorithm: 'brotli' })
    ]
    ```
- [ ] **Add Image Optimization:**
    ```typescript
    import viteImagemin from 'vite-plugin-imagemin';
    plugins: [viteImagemin()]
    ```

## 3. CI/CD Pipeline (`.github/workflows/main.yml`)
**Status:** PENDING (Waiting for Repo Integration)

### 3.1 Pipeline Stages
1.  **Checkout & Cache:** Standard.
2.  **Lint:** `npm run lint`.
3.  **Unit Tests:** `npm run test` (Vitest).
4.  **Build:** `npm run build`.
5.  **Size Check:** Fail build if main entry chunk exceeds 800kB.
6.  **License Scan:** Scan dependencies for non-compliant licenses (e.g., AGPL).

### 3.2 2025: Enhanced CI/CD
- [ ] **Add Coverage Report Upload:**
    ```yaml
    - name: Upload Coverage
      uses: codecov/codecov-action@v4
      with:
        files: ./coverage/coverage-final.json
    ```
- [ ] **Add Bundle Size Monitoring:**
    ```yaml
    - name: Check Bundle Size
      run: npx bundlesize
    ```
- [ ] **Add Security Scanning:**
    ```yaml
    - name: Run Security Audit
      run: npm audit --audit-level=moderate
    ```
- [ ] **Add Lighthouse CI:**
    ```yaml
    - name: Run Lighthouse CI
      uses: treosh/lighthouse-ci-action@v10
      with:
        uploadArtifacts: true
        temporaryPublicStorage: true
    ```

## 4. Environment Variables
- `API_KEY`: Google Gemini API Key.
- `VITE_USE_MOCK_MODELS`: Boolean.
- `VITE_ENABLE_BUNDLE_ANALYSIS`: Boolean (for bundle visualization).

## 5. 2025: Performance Monitoring

### 5.1 Bundle Size Budgets
```json
// package.json
"bundlesize": [
  {
    "path": "./dist/assets/index-*.js",
    "maxSize": "500 kB"
  },
  {
    "path": "./dist/assets/vendor-webllm-*.js",
    "maxSize": "50 MB"
  }
]
```

### 5.2 Performance Budgets
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1
- TTI (Time to Interactive): < 3.5s

## 6. 2025: Dependency Management
- [ ] **Use `npm-check-updates`**: Regular dependency updates
- [ ] **Add Dependabot**: Automated PR generation for updates
- [ ] **Lockfile Verification**: Ensure reproducible builds
- [ ] **Duplicate Package Detection**: Use `npm dedupe`

## 7. Release Management
- [ ] **Semantic Versioning**: Follow semver for releases
- [ ] **Changelog Generation**: Use `conventional-changelog`
- [ ] **Git Tags**: Tag each release with version number
- [ ] **Release Notes**: Auto-generate from commit messages
