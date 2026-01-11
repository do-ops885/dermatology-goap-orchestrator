# Agent Plan: Code Organization Refactor
**Focus:** 500 LOC Limit, Modular Architecture, Maintainability
**Last Updated:** 2026-01-11

## 0. Critical Alert (2026-01-11 - UPDATED)

### 0.1 Violation Status
| File | Current Lines | Limit | Status |
|------|---------------|-------|--------|
| `hooks/useClinicalAnalysis.ts` | **373** | 500 | ⚠️ **OK** (but could be reduced to <300) |
| `services/goap.ts` | **328** | 500 | ✅ OK |
| `services/agentDB.ts` | **307** | 500 | ✅ OK |
| `components/FairnessReport.tsx` | **319** | 500 | ✅ OK |
| `components/DiagnosticSummary.tsx` | **244** | 500 | ✅ OK |
| `components/AgentFlow.tsx` | **227** | 500 | ✅ OK |
| `services/vision.ts` | **201** | 500 | ✅ OK |
| `tests/e2e/clinical-flow.spec.ts` | **266** | 500 | ✅ OK |

### 0.2 ✅ REFACTORING COMPLETED
The refactoring has been successfully implemented:
- ✅ Created `services/executors/` directory with 20+ executor files
- ✅ Extracted all 16 agent executors to separate files
- ✅ Created `services/executors/types.ts` with common interfaces
- ✅ Created `services/executors/index.ts` for exports
- ✅ `useClinicalAnalysis.ts` reduced from 739 → 373 lines (49% reduction)

### 0.3 Current Status (2026-01-11)
**Status: ✅ PARTIALLY IMPLEMENTED**
- Executor extraction: ✅ Complete
- 500 LOC limit: ✅ All files now under 500 LOC
- Further optimization: ⚠️ `useClinicalAnalysis.ts` could be reduced to <300 LOC

## 1. Critical Issue: 500 LOC Violation
**File:** `hooks/useClinicalAnalysis.ts` (739 lines)
**Violation:** Exceeds 500 LOC limit by 239 lines (47% over limit)
**Priority:** HIGH - Immediate refactoring required

## 2. Refactoring Strategy

### 2.1 Extract Agent Executors
**Current State:** All 16 agent executors in `useClinicalAnalysis.ts`

**Target State:** Separate executor files in `services/executors/` directory

```
services/executors/
├── index.ts (export all executors)
├── imageVerificationExecutor.ts
├── skinToneDetectionExecutor.ts
├── calibrationExecutor.ts
├── preprocessingExecutor.ts
├── segmentationExecutor.ts
├── featureExtractionExecutor.ts
├── lesionDetectionExecutor.ts
├── similaritySearchExecutor.ts
├── riskAssessmentExecutor.ts
├── fairnessAuditExecutor.ts
├── webVerificationExecutor.ts
├── recommendationExecutor.ts
├── learningExecutor.ts
├── privacyEncryptionExecutor.ts
└── auditTrailExecutor.ts
```

### 2.2 Executor Template
- [ ] **Create Standard Executor Interface:**
    ```typescript
    // services/executors/types.ts
    export interface AgentExecutor {
      agentId: string;
      cost: number;
      execute(context: AgentContext): Promise<ExecutorResult>;
    }

    export interface AgentContext {
      ai: GoogleGenAI;
      reasoningBank: ReasoningBank;
      agentDB: AgentDB;
      localLLM: LocalLLMService;
      visionSpecialist: VisionSpecialist;
      router: RouterAgent;
      file: File;
      worldState: WorldState;
    }

    export interface ExecutorResult {
      metadata: Record<string, any>;
      newStateUpdates: Partial<WorldState>;
      shouldReplan?: boolean;
      error?: string;
    }
    ```

### 2.3 Individual Executor Implementation
- [ ] **Extract Image Verification Executor:**
    ```typescript
    // services/executors/imageVerificationExecutor.ts
    import type { AgentExecutor, AgentContext, ExecutorResult } from './types';

    export const imageVerificationExecutor: AgentExecutor = {
      agentId: 'Image-Verification-Agent',
      cost: 1,
      async execute(context: AgentContext): Promise<ExecutorResult> {
        const { file } = context;

        const isValid = await validateImageSignature(file);
        const hash = await calculateImageHash(file);

        return {
          metadata: {
            file_hash: hash,
            file_size: file.size,
            file_type: file.type
          },
          newStateUpdates: {
            image_verified: isValid
          },
          error: isValid ? undefined : 'Invalid image file type'
        };
      }
    };
    ```

- [ ] **Extract Skin Tone Detection Executor:**
    ```typescript
    // services/executors/skinToneDetectionExecutor.ts
    export const skinToneDetectionExecutor: AgentExecutor = {
      agentId: 'Skin-Tone-Detection-Agent',
      cost: 5,
      async execute(context: AgentContext): Promise<ExecutorResult> {
        const { ai, file, reasoningBank } = context;

        const imageData = await optimizeImage(file);
        const response = await ai.models.generateContent({
          contents: [{
            role: 'user',
            parts: [{ text: `Analyze skin tone (Fitzpatrick I-VI)` }]
          }]
        });

        const fitzpatrick = extractFitzpatrick(response);
        const confidence = extractConfidence(response);

        return {
          metadata: {
            fitzpatrick_type: fitzpatrick,
            confidence
          },
          newStateUpdates: {
            skin_tone_detected: true,
            fitzpatrick_type: fitzpatrick,
            confidence_score: confidence
          },
          shouldReplan: confidence < 0.65
        };
      }
    };
    ```

### 2.4 Refactored useClinicalAnalysis Hook
- [ ] **Simplified Hook (Target: <300 lines):**
    ```typescript
    // hooks/useClinicalAnalysis.ts
    import { useState, useRef, useCallback } from 'react';
    import * as executors from '../services/executors';
    import { GOAPPlanner } from '../services/goap';
    import type { WorldState, AgentLogEntry, AnalysisResult } from '../types';

    // Executor registry
    const EXECUTOR_REGISTRY = {
      'Image-Verification-Agent': executors.imageVerificationExecutor,
      'Skin-Tone-Detection-Agent': executors.skinToneDetectionExecutor,
      // ... map all executors
    };

    export function useClinicalAnalysis() {
      const [worldState, setWorldState] = useState(INITIAL_STATE);
      const [logs, setLogs] = useState<AgentLogEntry[]>([]);
      const [result, setResult] = useState<AnalysisResult | null>(null);
      const [analyzing, setAnalyzing] = useState(false);

      const executeAgent = useCallback(async (agentId: string) => {
        const executor = EXECUTOR_REGISTRY[agentId];
        if (!executor) {
          throw new Error(`Executor not found: ${agentId}`);
        }

        const result = await executor.execute(context);
        // ... handle result
      }, [/* dependencies */]);

      // ... rest of simplified hook logic
    }
    ```

## 3. File Size Tracking
- [ ] **Add LOC Monitoring:**
    ```bash
    # .github/workflows/loc-check.yml
    name: Check LOC Limits
    on: [pull_request]
    jobs:
      check:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
          - name: Count LOC
            run: |
              find src -name "*.ts" -o -name "*.tsx" | while read file; do
                loc=$(wc -l < "$file")
                if [ $loc -gt 500 ]; then
                  echo "::error file=$file::File exceeds 500 LOC limit ($loc lines)"
                  exit 1
                fi
              done
    ```

## 4. Additional Refactoring Opportunities

### 4.1 Extract Utilities
- [ ] **Create Utility Modules:**
    ```
    services/utils/
    ├── imageUtils.ts (optimizeImage, calculateImageHash, loadImageElement)
    ├── jsonUtils.ts (cleanAndParseJSON)
    ├── fileUtils.ts (validateImageSignature)
    └── validationUtils.ts (validateFile, validateWorldState)
    ```

### 4.2 Extract Service Initialization
- [ ] **Create Service Registry:**
    ```typescript
    // services/serviceRegistry.ts
    export class ServiceRegistry {
      private static instance: ServiceRegistry;
      private services = new Map<string, any>();

      static getInstance(): ServiceRegistry {
        if (!ServiceRegistry.instance) {
          ServiceRegistry.instance = new ServiceRegistry();
        }
        return ServiceRegistry.instance;
      }

      register<T>(key: string, service: T): void {
        this.services.set(key, service);
      }

      get<T>(key: string): T {
        return this.services.get(key);
      }

      async initialize(): Promise<void> {
        const db = await createDatabase();
        this.register('agentDB', db);

        const vision = new VisionSpecialist();
        await vision.initialize();
        this.register('vision', vision);

        // ... other services
      }
    }
    ```

### 4.3 Extract Configuration
- [ ] **Create Configuration Module:**
    ```typescript
    // config/constants.ts
    export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    export const MAX_IMAGE_SIZE = 800;
    export const CONFIDENCE_THRESHOLD = 0.65;
    export const LOW_CONFIDENCE_THRESHOLD = 0.50;
    export const AGENT_TIMEOUT_MS = 30000;
    export const MAX_RETRY_ATTEMPTS = 3;
    ```

## 5. Code Organization Best Practices

### 5.1 File Naming Conventions
- [ ] **Consistent Naming:**
    - Executors: `*Executor.ts`
    - Utilities: `*.ts` (no Utils suffix preferred)
    - Services: Lowercase: `service.ts`
    - Components: PascalCase: `ComponentName.tsx`
    - Types: `types.ts` or domain-specific: `agentTypes.ts`

### 5.2 Import Organization
- [ ] **Standard Import Order:**
    ```typescript
    // 1. External libraries
    import { useState, useCallback } from 'react';
    import { z } from 'zod';

    // 2. Internal types
    import type { WorldState, AgentContext } from '../types';

    // 3. Internal services
    import { ServiceRegistry } from '../services/serviceRegistry';
    import * as executors from '../services/executors';

    // 4. Relative imports
    import { helperFunction } from './helpers';
    ```

### 5.3 Export Organization
- [ ] **Use Index Files:**
    ```typescript
    // services/executors/index.ts
    export * from './imageVerificationExecutor';
    export * from './skinToneDetectionExecutor';
    // ... export all executors
    ```

## 6. Refactoring Checklist
- [ ] Create `services/executors/` directory structure
- [ ] Extract all 16 agent executors to separate files
- [ ] Create `services/executors/types.ts` with common interfaces
- [ ] Create `services/executors/index.ts` for exports
- [ ] Refactor `hooks/useClinicalAnalysis.ts` to use executors (target: <300 LOC)
- [ ] Extract utility functions to `services/utils/`
- [ ] Create `services/serviceRegistry.ts`
- [ ] Create `config/constants.ts`
- [ ] Update imports in all files
- [ ] Run tests to ensure no functionality broken
- [ ] Update documentation with new structure
- [ ] Add LOC check to CI/CD pipeline
- [ ] Verify final LOC of all files

## 7. Testing the Refactor
- [ ] **Unit Tests:** Each executor has unit tests
- [ ] **Integration Tests:** Hook works with new executor structure
- [ ] **E2E Tests:** Full clinical flow still works
- [ ] **Performance:** No performance regression
- [ ] **Code Review:** Peer review of refactored code

## 8. Documentation Updates
- [ ] **Update AGENTS.md:** Document new executor structure
- [ ] **Update README:** Explain new architecture
- [ ] **Add Architecture Diagrams:** Visualize new structure
- [ ] **Document File Conventions:** Explain naming rules
- [ ] **Update Contributing Guide:** Explain refactoring rules

## 9. Metrics and Monitoring
- [ ] **Track LOC per File:** Automated monitoring
- [ ] **Track Cyclomatic Complexity:** Measure complexity
- [ ] **Track Maintainability Index:** Code quality metric
- [ ] **Alert on Violations:** Notify on violations
- [ ] **Trend Analysis:** Monitor metrics over time

## 10. Success Criteria
- [ ] All files under 500 LOC
- [ ] `useClinicalAnalysis.ts` under 300 LOC
- [ ] All executors under 150 LOC
- [ ] All tests passing
- [ ] No functionality broken
- [ ] CI/CD passing with LOC checks
- [ ] Code review approved
- [ ] Documentation updated
