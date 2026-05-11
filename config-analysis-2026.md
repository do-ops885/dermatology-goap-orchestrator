# Configuration Analysis Report 2026

## Executive Summary

Current configuration is ~85% aligned with 2026 best practices. Key gaps: WebGPU headers, test pool optimization, and ESLint 9.17+ features.

---

## 1. ESLint v9 Best Practices (2026)

### Current State ✓

- Flat config (`eslint.config.js`) - correct
- TypeScript strict type-checked rules enabled
- Security plugin (eslint-plugin-security) configured
- SonarJS code quality rules

### Recommended Improvements

#### Use `defineConfig` Pattern (ESLint 9.17+)

```js
import { defineConfig } from 'eslint/config';

export default defineConfig([
  js.configs.recommended,
  {
    extends: ['js/recommended', 'ts-eslint/strictTypeChecked', 'ts-eslint/stylisticTypeChecked'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
]);
```

#### Modern Plugin Imports

```js
// For plugins supporting flat config natively
import importPlugin from 'eslint-plugin-import';
import unicorn from 'eslint-plugin-unicorn';

// Use fixupPluginRules for legacy plugins
import { fixupPluginRules } from '@eslint/compat';
```

---

## 2. TypeScript Configuration

### Current State ✓

- `strict: true` with all sub-options
- `noUncheckedIndexedAccess: true` (2026 best practice)
- `exactOptionalPropertyTypes: true` (2026 best practice)
- ES2022 target

### Recommended Addition

```json
{
  "compilerOptions": {
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "types": ["node", "vitest/globals"]
  }
}
```

---

## 3. Vite 6 + WebGPU/WebLLM Configuration

### Current State ⚠

- Manual chunks configured correctly
- Missing WebGPU headers
- Missing worker ES module format

### Recommended Configuration

```typescript
// vite.config.ts
export default defineConfig({
  // WebGPU/WebLLM requirements
  worker: {
    format: 'es', // Required for @mlc-ai/web-llm
  },

  // Header security + SharedArrayBuffer
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  // Dependency optimization
  optimizeDeps: {
    include: ['@tensorflow/tfjs', '@mlc-ai/web-llm', '@xenova/transformers'],
  },

  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'framer-motion'],
          'vendor-ai-core': ['@google/genai', 'agentdb', '@xenova/transformers'],
          'vendor-tfjs': ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-webgpu'],
          'vendor-webllm': ['@mlc-ai/web-llm'],
        },
      },
    },
  },
});
```

---

## 4. Vitest 4 Best Practices

### Current State ✓

- V8 coverage provider
- Coverage thresholds (gradually increasing)
- jsdom environment

### Recommended Enhancements

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Performance: threads pool for parallel execution
    pool: 'threads',
    poolOptions: {
      threads: { isolate: true },
    },

    // Coverage thresholds (industry standard: 80%)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },

    // Include test utilities
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
});
```

---

## 5. Playwright E2E Best Practices

### Current State ✓

- Sharded test execution
- Trace and video recording on retry
- CI-optimized launch options

### Recommended Enhancement

```typescript
// playwright.config.ts
export default defineConfig({
  // Use workers: 4 for CI parallelization
  workers: process.env.CI ? 4 : undefined,

  // Enhanced reporting
  reporter: process.env.CI
    ? [
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results.json' }],
      ]
    : 'html',

  // Add expect timeout customization
  expect: {
    timeout: 15000,
  },
});
```

---

## 6. GitHub Actions CI/CD

### Current State ✓

- Concurrent run cancellation
- Matrix sharding for E2E tests
- Artifact upload with retention

### Recommended Updates

#### Use Node 22 (ESLint 9.17+ optimal)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22' # Required for ESLint 9.17+ features
    cache: 'npm'
```

#### Enhanced Dependency Security

```yaml
- name: Run npm audit
  run: npm audit --audit-level moderate

- name: Check for lockfile updates
  run: bash scripts/validate-lockfile.sh
```

---

## 7. package.json Script Commands

### Recommended Script Additions

```json
{
  "scripts": {
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "typecheck:watch": "tsc --build --watch",
    "bench": "node scripts/test-performance.sh",
    "check:updates": "ncu -u"
  }
}
```

---

## 8. AGENTS.md Updates Needed

| Section        | Current           | Recommendation                 |
| -------------- | ----------------- | ------------------------------ |
| Last Updated   | 2026-02-10        | Update to current date         |
| Node version   | >=20              | >=20.19 (ESLint 9 requirement) |
| Commands table | Missing typecheck | Add `npm run typecheck`        |

---

## Priority Action Items

1. **High**: Add COOP/COEP headers for WebGPU SharedArrayBuffer
2. **High**: Update Vitest pool to 'threads' for performance
3. **Medium**: Add worker.format: 'es' for WebLLM
4. **Medium**: Add `defineConfig` to ESLint config
5. **Low**: Update coverage thresholds to 80%
6. **Low**: Add missing scripts to package.json
