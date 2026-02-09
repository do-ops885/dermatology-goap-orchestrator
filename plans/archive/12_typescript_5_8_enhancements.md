# Agent Plan: TypeScript 5.8 Enhancements

**Focus:** Type Safety, Compiler Features, Strict Mode, Modern Patterns

## 1. TypeScript 5.8 Upgrade Status

**Current Version:** TypeScript ~5.8.2
**Status:** ✅ INSTALLED (Latest) but ⚠️ NOT FULLY IMPLEMENTED

### 0.1 Current Implementation Status (2026-01-14)

| Feature                    | Status             | Implementation Level        |
| -------------------------- | ------------------ | --------------------------- |
| TypeScript 5.8.2 installed | ✅                 | Complete                    |
| Enhanced ESLint rules      | ✅                 | Full TypeScript strict mode |
| `strictTypeChecked`        | ✅                 | Enabled in ESLint config    |
| `stylisticTypeChecked`     | ✅                 | Enabled in ESLint config    |
| Import attributes          | ❌ Not implemented | New 5.8 syntax not used     |
| Runtime validation (Zod)   | ❌ Not implemented | No validation schemas       |
| Advanced type patterns     | ⚠️ Partial         | Basic discriminated unions  |
| `no-explicit-any`          | ✅                 | Enforced as error           |
| Security type patterns     | ✅                 | Brand types partially used  |

## 2. TypeScript 5.8 New Features

### 2.1 Import Attributes (New in 5.8)

- [ ] **Replace Import Assertions:**

  ```typescript
  // Old syntax (deprecated)
  import data from './data.json' assert { type: 'json' };

  // New syntax (TypeScript 5.8)
  import data from './data.json' with { type: 'json' };
  ```

### 2.2 Enhanced Type Inference

- [ ] **Leverage Improved Type Narrowing:**
  ```typescript
  function processValue(value: string | number | null) {
    // TypeScript 5.8 has better type narrowing
    if (value !== null) {
      // Type is string | number (narrowed)
      return value.toString();
    }
    return '';
  }
  ```

## 3. Enhanced Compiler Options

### 3.1 Stricter Type Checking

- [ ] **Enable `strictNullChecks`:**
  ```json
  // tsconfig.json
  {
    "compilerOptions": {
      "strictNullChecks": true
    }
  }
  ```
- [ ] **Enable `noUncheckedIndexedAccess`:**
  ```json
  {
    "compilerOptions": {
      "noUncheckedIndexedAccess": true
    }
  }
  ```
- [ ] **Enable `noImplicitOverride`:**
  ```json
  {
    "compilerOptions": {
      "noImplicitOverride": true
    }
  }
  ```
- [ ] **Enable `exactOptionalPropertyTypes`:**
  ```json
  {
    "compilerOptions": {
      "exactOptionalPropertyTypes": true
    }
  }
  ```

### 3.2 Updated tsconfig.json

- [ ] **Apply Enhanced Configuration:**
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "experimentalDecorators": true,
      "useDefineForClassFields": false,
      "module": "ESNext",
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "skipLibCheck": true,
      "types": ["node"],
      "moduleResolution": "bundler",
      "isolatedModules": true,
      "moduleDetection": "force",
      "allowJs": true,
      "jsx": "react-jsx",
      "paths": {
        "@/*": ["./*"]
      },
      "allowImportingTsExtensions": true,
      "noEmit": true,
      // 2025 Enhancements
      "strict": true,
      "strictNullChecks": true,
      "noUncheckedIndexedAccess": true,
      "noImplicitOverride": true,
      "exactOptionalPropertyTypes": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noImplicitReturns": true,
      "noFallthroughCasesInSwitch": true
    }
  }
  ```

## 4. Runtime Type Validation with Zod

### 4.1 Zod Schema Integration

- [ ] **Add Zod Dependency:**
  ```bash
  npm install zod
  npm install --save-dev @types/zod
  ```

### 4.2 Runtime Validation Schemas

- [ ] **Create Validation Schemas:**

  ```typescript
  // schemas/validation.ts
  import { z } from 'zod';

  // WorldState Schema
  export const WorldStateSchema = z.object({
    image_verified: z.boolean(),
    skin_tone_detected: z.boolean(),
    fitzpatrick_type: z.enum(['I', 'II', 'III', 'IV', 'V', 'VI']).nullable(),
    image_preprocessed: z.boolean(),
    segmentation_complete: z.boolean(),
    features_extracted: z.boolean(),
    lesions_detected: z.boolean(),
    fairness_validated: z.boolean(),
    similarity_searched: z.boolean(),
    risk_assessed: z.boolean(),
    web_verified: z.boolean(),
    recommendations_generated: z.boolean(),
    learning_updated: z.boolean(),
    data_encrypted: z.boolean(),
    audit_logged: z.boolean(),
    confidence_score: z.number().min(0).max(1),
    fairness_score: z.number().min(0).max(1),
    is_low_confidence: z.boolean(),
    safety_calibrated: z.boolean(),
    calibration_complete: z.boolean(),
  });

  export type WorldState = z.infer<typeof WorldStateSchema>;

  // File Upload Schema
  export const FileUploadSchema = z.object({
    name: z
      .string()
      .max(255)
      .regex(/^[a-zA-Z0-9._-]+$/),
    type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    size: z.number().max(10 * 1024 * 1024), // 10MB
  });

  // Agent Log Schema
  export const AgentLogSchema = z.object({
    id: z.string().uuid(),
    agent: z.string(),
    status: z.enum(['pending', 'running', 'completed', 'failed']),
    message: z.string(),
    timestamp: z.number(),
    metadata: z.record(z.any()).optional(),
  });
  ```

### 4.3 Validation in Code

- [ ] **Apply Validation:**

  ```typescript
  // services/agentDB.ts
  import { WorldStateSchema, FileUploadSchema } from './schemas/validation';

  function updateWorldState(newState: Partial<WorldState>) {
    // Validate before updating
    const validated = WorldStateSchema.partial().parse(newState);
    // ... apply state update
  }

  function handleFileUpload(file: File) {
    const validated = FileUploadSchema.parse({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    // ... process file
  }
  ```

## 5. Advanced Type Patterns

### 5.1 Discriminated Unions

- [ ] **Use for Agent Actions:**

  ```typescript
  type AgentAction = {
    id: string;
    name: string;
    cost: number;
  } & (
    | { type: 'detection'; threshold: number }
    | { type: 'calibration'; mode: 'standard' | 'safety' }
    | { type: 'analysis'; includeFairness: boolean }
  );

  function executeAction(action: AgentAction) {
    switch (action.type) {
      case 'detection':
        // TypeScript knows action has threshold
        return runDetection(action.threshold);
      case 'calibration':
        // TypeScript knows action has mode
        return runCalibration(action.mode);
      case 'analysis':
        // TypeScript knows action has includeFairness
        return runAnalysis(action.includeFairness);
    }
  }
  ```

### 5.2 Template Literal Types

- [ ] **Use for Agent IDs:**

  ```typescript
  type AgentID = `agent-${string}`;

  const validAgentId: AgentID = 'agent-skin-tone-detection';
  // const invalidAgentId: AgentID = 'invalid'; // Error

  function registerAgent(id: AgentID, executor: Function) {
    // Type-safe agent registration
  }
  ```

### 5.3 Utility Types

- [ ] **Create Custom Utility Types:**

  ```typescript
  // types/utilities.ts
  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };

  type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

  type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

  // Usage
  type PartialWorldState = DeepPartial<WorldState>;
  type OptionalWorldState = Optional<WorldState, 'confidence_score'>;
  type RequiredWorldState = RequiredKeys<WorldState, 'image_verified' | 'audit_logged'>;
  ```

## 6. Type Safety Improvements

### 6.1 Remove `any` Types

- [ ] **Replace `any` with Proper Types:**

  ```typescript
  // Bad
  function processData(data: any) {
    /* ... */
  }

  // Good
  interface ProcessedData {
    id: string;
    result: AnalysisResult;
    metadata: Record<string, unknown>;
  }
  function processData(data: ProcessedData) {
    /* ... */
  }
  ```

### 6.2 Use `unknown` for Uncertain Types

- [ ] **Replace `any` with `unknown`:**

  ```typescript
  // Bad
  function parseResponse(response: any) {
    return response.data;
  }

  // Good
  function parseResponse(response: unknown): AnalysisResult {
    if (typeof response !== 'object' || response === null) {
      throw new Error('Invalid response');
    }
    return AnalysisResultSchema.parse(response);
  }
  ```

### 6.3 Brand Types for Values

- [ ] **Create Branded Types:**

  ```typescript
  type Hashed = string & { readonly __brand: unique symbol };
  type Encrypted = string & { readonly __brand: unique symbol };
  type UUID = string & { readonly __brand: unique symbol };

  function hashValue(value: string): Hashed {
    const hash = crypto.subtle.digest('SHA-256', value);
    return hash as Hashed;
  }

  function encryptData(data: string): Encrypted {
    const encrypted = crypto.subtle.encrypt(/* ... */);
    return encrypted as Encrypted;
  }

  // Type safety ensures functions are called correctly
  const hashed = hashValue('data');
  const encrypted = encryptData('data');
  // Cannot use encrypted where hashed is expected
  ```

## 7. Generic Types and Constraints

### 7.1 Generic Utility Functions

- [ ] **Create Type-Safe Utilities:**

  ```typescript
  function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
  }

  function first<T>(array: T[]): T | undefined {
    return array[0];
  }

  function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    return keys.reduce(
      (result, key) => {
        result[key] = obj[key];
        return result;
      },
      {} as Pick<T, K>,
    );
  }
  ```

### 7.2 Generic Components

- [ ] **Create Generic Component Types:**

  ```typescript
  interface Props<T> {
    data: T[];
    renderItem: (item: T) => React.ReactNode;
    onSelect: (item: T) => void;
  }

  function List<T>({ data, renderItem, onSelect }: Props<T>) {
    return (
      <ul>
        {data.map((item, index) => (
          <li key={index} onClick={() => onSelect(item)}>
            {renderItem(item)}
          </li>
        ))}
      </ul>
    );
  }

  // Usage
  <List
    data={logs}
    renderItem={(log) => <span>{log.agent}</span>}
    onSelect={(log) => console.log(log)}
  />
  ```

## 8. Type Guards and Type Predicates

- [ ] **Create Custom Type Guards:**

  ```typescript
  function isWorldState(obj: unknown): obj is WorldState {
    return WorldStateSchema.safeParse(obj).success;
  }

  function isAgentLog(obj: unknown): obj is AgentLogEntry {
    return AgentLogSchema.safeParse(obj).success;
  }

  function isError(error: unknown): error is Error {
    return error instanceof Error;
  }

  // Usage
  function handleUnknownData(data: unknown) {
    if (isWorldState(data)) {
      // TypeScript knows data is WorldState
      updateState(data);
    }
  }
  ```

## 9. ESLint TypeScript Configuration (Updated 2026-01-11)

- [x] **Enhance ESLint Rules with 2025 Best Practices:**

  ```javascript
  // eslint.config.js
  import tseslint from 'typescript-eslint';
  import eslintPluginSecurity from 'eslint-plugin-security';
  import sonarjs from 'eslint-plugin-sonarjs';

  export default tseslint.config({
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      security: eslintPluginSecurity,
      sonarjs: sonarjs,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/strict-boolean-expressions': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  });
  ```

- [x] **Add Security Plugin**: `eslint-plugin-security` for security hotspot detection
- [x] **Add SonarJS Plugin**: `eslint-plugin-sonarjs` for code quality and bug detection

## 10. Migration Checklist

- [x] TypeScript 5.8.2 installed
- [ ] Update `tsconfig.json` with strict options
- [ ] Add Zod for runtime validation
- [ ] Create validation schemas for all types
- [ ] Replace import assertions with import attributes
- [ ] Remove all `any` types
- [ ] Add proper type guards
- [ ] Implement branded types for sensitive values
- [ ] Update ESLint TypeScript rules
- [ ] Add type checking to CI/CD pipeline
- [ ] Document type patterns in codebase

## 11. Type Testing

- [ ] **TypeScript Unit Tests:** Verify type correctness
- [ ] **Zod Schema Tests:** Test validation logic
- [ ] **Type Coverage:** Monitor type coverage percentage
- [ ] **Type Diff Tests:** Catch breaking type changes

## 12. Documentation

- [ ] **Type Documentation:** Document complex types
- [ ] **Schema Documentation:** Document Zod schemas
- [ ] **Type Examples:** Provide usage examples
- [ ] **Type Migration Guide:** Document type changes
