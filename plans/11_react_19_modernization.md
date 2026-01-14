# Agent Plan: React 19 Modernization

**Focus:** React 19 Best Practices, Performance Optimization, Modern Patterns
**Last Updated:** 2026-01-11

## 0. Current Analysis (2026-01-11)

### 0.1 Implementation Status

| Feature                | Status             | Location                       |
| ---------------------- | ------------------ | ------------------------------ |
| React 19.2.3 installed | ✅                 | `package.json`                 |
| `useTransition`        | ❌ Not implemented | `hooks/useClinicalAnalysis.ts` |
| `useDeferredValue`     | ❌ Not implemented | -                              |
| `useActionState`       | ❌ Not implemented | -                              |
| `useOptimistic`        | ❌ Not implemented | -                              |
| React.memo components  | ❌ Not implemented | UI components                  |
| Direct function syntax | ⚠️ Partial         | Mixed patterns                 |

### 0.2 Priority Actions

1. **P0:** Add `useTransition` for non-blocking log updates
2. **P1:** Add `useOptimistic` for instant feedback
3. **P2:** Memoize heavy UI components

## 1. React 19 Upgrade Status

**Current Version:** React 19.2.3
**Status:** ✅ INSTALLED (React 19.2.3 - Latest stable)
**Implementation:** ⚠️ PARTIAL - React installed but modern patterns not yet implemented

## 2. React 19 Best Practices Implementation

### 2.1 Use `useTransition` for Non-Urgent Updates

- [ ] **Apply to Heavy State Updates:**

  ```typescript
  // hooks/useClinicalAnalysis.ts
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  const addAgentLog = (log: AgentLogEntry) => {
    // Mark as non-urgent for better UX
    startTransition(() => {
      setLogs((prev) => [...prev, log]);
    });
  };
  ```

### 2.2 Use `useDeferredValue` for Search/Filtering

- [ ] **Defer Expensive Filtering:**

  ```typescript
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => log.agent.toLowerCase().includes(deferredQuery.toLowerCase()));
  }, [logs, deferredQuery]);
  ```

### 2.3 Use `useActionState` for Form Handling

- [ ] **Replace useState with useActionState:**

  ```typescript
  async function submitAnalysis(prev: any, formData: FormData) {
    const result = await executeAnalysis(formData);
    return result;
  }

  const [state, action, pending] = useActionState(submitAnalysis, null);

  return (
    <form action={action}>
      {/* Form content */}
      {pending && <LoadingSpinner />}
    </form>
  );
  ```

### 2.4 Use `useOptimistic` for Instant Feedback

- [ ] **Optimistic UI Updates:**

  ```typescript
  const [logs, addLog] = useOptimistic<AgentLogEntry[]>(currentLogs, (state, newLog) => [
    ...state,
    newLog,
  ]);

  const handleSubmit = async () => {
    addLog(newLog); // Optimistic update
    await executeAgent(newLog.agentId);
  };
  ```

## 3. React 19 Component Patterns

### 3.1 Remove `React.FC` Type

- [ ] **Direct Function Components:**

  ```typescript
  // Old pattern (deprecated)
  interface Props {
    title?: string;
    children: React.ReactNode;
  }
  const Component: React.FC<Props> = ({ title = 'Default', children }) => {
    return <div>{title}{children}</div>;
  };

  // New pattern (React 19)
  interface Props {
    title?: string;
    children: React.ReactNode;
  }
  function Component({ title = 'Default', children }: Props) {
    return <div>{title}{children}</div>;
  }
  ```

### 3.2 Use Default Parameters Instead of defaultProps

- [ ] **Replace defaultProps with Default Parameters:**

  ```typescript
  // Old pattern (deprecated)
  function Component({ title, children }: Props) {
    return <div>{title}{children}</div>;
  }
  Component.defaultProps = {
    title: 'Default Title'
  };

  // New pattern (React 19)
  function Component({ title = 'Default Title', children }: Props) {
    return <div>{title}{children}</div>;
  }
  ```

### 3.3 Use `use` API for Resources

- [ ] **Direct Resource Access:**

  ```typescript
  // For Promises
  function UserData({ userId }: { userId: string }) {
    const user = use(fetchUser(userId));
    return <div>{user.name}</div>;
  }

  // For Context
  function UserProfile() {
    const theme = use(ThemeContext);
    return <div>{theme}</div>;
  }
  ```

## 4. Performance Optimization Patterns

### 4.1 Memoize Components with `React.memo`

- [ ] **Memoize Heavy Components:**

  ```typescript
  const MemoizedAgentFlow = React.memo(AgentFlow, (prevProps, nextProps) => {
    // Custom comparison for logs array
    return prevProps.logs.length === nextProps.logs.length;
  });

  const MemoizedDiagnosticSummary = React.memo(DiagnosticSummary);
  const MemoizedPatientSafetyState = React.memo(PatientSafetyState);
  ```

### 4.2 Use `useMemo` for Expensive Computations

- [ ] **Memoize Derived State:**

  ```typescript
  const sortedLogs = useMemo(() => {
    return logs.sort((a, b) => b.timestamp - a.timestamp).filter((log) => log.status !== 'pending');
  }, [logs]);

  const fairnessMetrics = useMemo(() => {
    return calculateFairnessMetrics(worldState);
  }, [worldState]);
  ```

### 4.3 Use `useCallback` for Stable References

- [ ] **Stable Event Handlers:**

  ```typescript
  const handleFileChange = useCallback((file: File) => {
    validateAndProcessFile(file);
  }, []); // Empty deps if function doesn't change

  const handleExecute = useCallback(() => {
    executeAnalysis();
  }, [executeAnalysis]);
  ```

## 5. Minimize `useEffect` Usage

### 5.1 Colocate State Updates

- [ ] **Remove Unnecessary Effects:**

  ```typescript
  // Old pattern (avoid)
  useEffect(() => {
    if (file) {
      processFile(file);
    }
  }, [file]);

  // New pattern (preferred)
  const handleFileChange = (newFile: File | null) => {
    setFile(newFile);
    if (newFile) {
      processFile(newFile);
    }
  };
  ```

### 5.2 Use Event Handlers for Logic

- [ ] **Move Logic from Effects to Handlers:**

  ```typescript
  // Direct handler calls instead of effects
  const initializeServices = async () => {
    const db = await createDatabase();
    setAgentDB(db);
  };

  // Call directly when needed, not in useEffect
  initializeServices();
  ```

## 6. React 19 Server Components (Future)

- [ ] **Plan for RSC Integration:** Evaluate migrating to Next.js with Server Components
- [ ] **Server-Side Rendering:** Move data fetching to server when beneficial
- [ ] **Streaming Suspense:** Use Suspense boundaries for progressive rendering

## 7. React 19 Error Handling

### 7.1 Enhanced Error Boundaries

- [ ] **Use Error Boundary Hooks:**
  ```typescript
  function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
      <div role="alert">
        <p>Something went wrong:</p>
        <pre>{error.message}</pre>
        <button onClick={resetErrorBoundary}>Try again</button>
      </div>
    );
  }
  ```

### 7.2 Error Logging Integration

- [ ] **Log Errors with Context:**
  ```typescript
  function logError(error: Error, componentStack: string) {
    Logger.error('React Error', {
      message: error.message,
      stack: error.stack,
      componentStack,
    });
  }
  ```

## 8. React 19 Transition Updates

- [ ] **Batch State Updates:**
  ```typescript
  // React 19 automatically batches updates
  function updateMultipleStates() {
    setLogs(newLogs); // Batched
    setWorldState(newState); // Batched
    setResult(newResult); // All in one render
  }
  ```

## 9. React 19 Form Enhancements

- [ ] **Use Native Form Validation:**
  ```typescript
  function FileUploadForm() {
    return (
      <form>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
        />
        <button type="submit">Upload</button>
      </form>
    );
  }
  ```

## 10. Testing React 19 Features

- [ ] **Test `useTransition`:** Verify non-blocking UI updates
- [ ] **Test `useOptimistic`:** Verify optimistic UI updates
- [ ] **Test `useActionState`:** Verify form state management
- [ ] **Test Suspense Boundaries:** Verify progressive loading

## 11. Migration Checklist

- [x] React 19.2.3 installed
- [ ] Update all components to use direct function syntax
- [ ] Remove `defaultProps` from all components
- [ ] Replace `useState` with `useActionState` for forms
- [ ] Add `useTransition` for heavy state updates
- [ ] Add `useOptimistic` for optimistic UI updates
- [ ] Memoize expensive components with `React.memo`
- [ ] Remove unnecessary `useEffect` hooks
- [ ] Update tests for React 19 features
- [ ] Update documentation with React 19 patterns

## 12. React 19 Performance Monitoring

- [ ] **Track Component Re-renders:**

  ```typescript
  const { Profiler } = React;

  function onRenderCallback(
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number
  ) {
    if (actualDuration > baseDuration * 2) {
      Logger.warn('Slow Render', { id, actualDuration, baseDuration });
    }
  }

  <Profiler id="App" onRender={onRenderCallback}>
    <App />
  </Profiler>
  ```

- [ ] **Monitor Transition Duration:** Track `useTransition` performance
- [ ] **Identify Render Bottlenecks:** Find components causing slow renders
