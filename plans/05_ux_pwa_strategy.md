# Agent Plan: UX-A11y-Lead

**Focus:** Accessibility, Perceived Performance, App-like Behavior
**Last Updated:** 2026-01-14

### 0.1 Current Implementation Status (2026-01-14)

| Feature Category       | Status             | Implementation Details                      |
| ---------------------- | ------------------ | ------------------------------------------- |
| PWA Implementation     | ✅ COMPLETE        | Manifest + Service Worker active            |
| Accessibility Tests    | ✅ COMPLETE        | 3 test files in `tests/a11y/` (85 LOC+)     |
| Model Loading Progress | ✅ COMPLETE        | `ModelProgress.tsx` component implemented   |
| Lazy Loading           | ✅ COMPLETE        | Services initialize on user interaction     |
| Focus Management       | ⚠️ PARTIAL         | Basic focus, needs enhancement              |
| WCAG 2.1 Compliance    | ⚠️ PARTIAL         | Tests implemented, full compliance pending  |
| Dark Mode              | ❌ NOT IMPLEMENTED | No theme toggle or dark mode support        |
| React 19 Patterns      | ❌ NOT IMPLEMENTED | No `useTransition` or modern React features |
| i18n Support           | ❌ NOT IMPLEMENTED | No internationalization support             |

## 1. PWA Implementation

**Status:** LIVE (Manifest + SW Active)

### 1.1 Enhancements

- [x] **Custom Install Prompt:** Intercept `beforeinstallprompt` event. Show a branded "Install Clinical AI" button in `Header` instead of browser default.
- [x] **Offline UI:** If `navigator.onLine` is false:
  - Disable "Web Verification" agent visually.
  - Show a "Offline Mode: Local AI Only" banner.

### 1.2 2025: Service Worker Optimization

- [ ] **Implement Stale-While-Revalidate Strategy:**

  ```typescript
  // public/sw.js
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'images-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    }),
  );

  workbox.routing.registerRoute(
    ({ url }) => url.origin === 'https://generativelanguage.googleapis.com',
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  );
  ```

- [ ] **Background Sync for Offline Analysis:**
  ```typescript
  self.addEventListener('sync', (event) => {
    if (event.tag === 'analysis-sync') {
      event.waitUntil(syncPendingAnalyses());
    }
  });
  ```

## 2. AI UX & Loading States

Downloading `SmolLM2` (~1GB+) takes time.

- [x] **Progress Indicator:** Create a `ModelDownloadBar` component.
  - Hook into `LocalLLMService` init callback.
  - Show precise MB/GB progress.
- [x] **Lazy Loading:** Do not initialize `VisionSpecialist` or `LocalLLMService` on page load. Initialize only when user hovers over upload area or selects a file.

### 2.1 2025: Enhanced Loading States

- [ ] **Implement Skeleton Loading:** For `AgentFlow` and `DiagnosticSummary` components
- [ ] **Progressive Rendering:** Show partial results as agents complete
- [ ] **Loading Indicators:** Use `useTransition` for non-urgent updates:

  ```typescript
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  startTransition(() => {
    setLogs((prev) => [...prev, newLog]);
  });
  ```

## 3. Accessibility (WCAG 2.1 AA)

### 3.1 Focus Management

- [ ] **Live Region Focus:** When "Run Analysis" is clicked, focus should move to `AgentFlow` container:
  ```typescript
  <div aria-live="polite" aria-atomic="true" ref={agentFlowRef}>
    <AgentFlow logs={logs} />
  </div>
  ```
- [ ] **Focus Trap:** Implement focus trap in modals (FairnessReport)
- [ ] **Skip to Main Content:** Add skip link at top of page

### 3.2 2025: Enhanced A11y Features

- [ ] **Color Blindness Support:** Add texture/pattern patterns to risk indicators
  ```typescript
  <div className={cn(
    'risk-indicator',
    { 'risk-high': risk === 'High' },
    { 'risk-medium': risk === 'Medium' },
    { 'risk-low': risk === 'Low' }
  )}>
    <AlertIcon /> // Icon support for color blind users
    {risk}
  </div>
  ```
- [ ] **Keyboard Navigation:** Full keyboard support for all interactive elements
- [ ] **Screen Reader Optimization:**
  - Add `aria-label` to icon-only buttons
  - Use `aria-describedby` for complex form fields
  - Announce agent status changes via ARIA live regions

### 3.3 Motion & Animation

- [ ] **Reduced Motion:** Respect `prefers-reduced-motion`:

  ```typescript
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  <AnimatePresence>
    <motion.div
      animate={prefersReducedMotion ? {} : { opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
    />
  </AnimatePresence>
  ```

- [ ] **Pause Animations:** Allow users to pause animations
- [ ] **High Contrast Mode:** Detect and adapt for high contrast preferences

## 4. 2025: React 19 Best Practices

### 4.1 Reduce Re-renders

- [ ] **Memoize Heavy Components:**
  ```typescript
  const MemoizedAgentFlow = React.memo(AgentFlow);
  const MemoizedDiagnosticSummary = React.memo(DiagnosticSummary);
  ```
- [ ] **Use `useMemo` for Expensive Computations:**
  ```typescript
  const sortedLogs = useMemo(() => {
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }, [logs]);
  ```

### 4.2 Minimize `useEffect` Usage

- [ ] **Colocate State Updates:** Move effect logic directly into event handlers
- [ ] **Use Event Handlers Instead of Effects:**

  ```typescript
  // Old pattern (avoid)
  useEffect(() => {
    if (file) {
      handleFileUpload(file);
    }
  }, [file]);

  // New pattern (preferred)
  const handleFileChange = (newFile: File) => {
    setFile(newFile);
    if (newFile) {
      handleFileUpload(newFile);
    }
  };
  ```

### 4.3 Use `useActionState` for Form Handling

- [ ] **Implement Action State Pattern:**

  ```typescript
  async function submitAnalysis(prev: any, formData: FormData) {
    const result = await executeAnalysis(formData);
    return result;
  }

  const [state, action, pending] = useActionState(submitAnalysis, null);
  ```

## 5. Performance UX

### 5.1 Perceived Performance

- [ ] **Skeleton Screens:** Show while data loads
- [ ] **Progressive Image Loading:** Load low-res first, high-res on demand
- [ ] **Optimistic UI:** Update UI immediately, rollback on error

### 5.2 2025: Core Web Vitals Optimization

- [ ] **LCP < 2.5s:** Largest Contentful Paint optimization
- [ ] **FID < 100ms:** First Input Delay optimization
- [ ] **CLS < 0.1:** Cumulative Layout Shift prevention
- [ ] **INP < 200ms:** Interaction to Next Paint (new metric)

### 5.3 Performance Monitoring UI

- [ ] **Real-time Performance Display:** Show LCP, CLS, FID in dev mode
- [ ] **Performance Budget Warnings:** Alert when exceeding budgets
- [ ] **Network Status Indicator:** Show connection quality and latency

## 6. Responsive Design

### 6.1 Mobile-First Approach

- [ ] **Touch Targets:** Minimum 44x44 pixels for buttons
- [ ] **Fluid Typography:** Use `clamp()` for responsive text:
  ```css
  h1 {
    font-size: clamp(1.5rem, 5vw, 2.5rem);
  }
  ```
- [ ] **Flexible Grid:** Use `minmax()` for grid columns

### 6.2 2025: Advanced Responsive Features

- [ ] **Container Queries:** Use `@container` for component-level responsiveness
- [ ] **Adaptive Layouts:** Automatically switch between grid/list views based on space
- [ ] **Device-Specific Optimizations:** Different layouts for mobile/tablet/desktop

## 7. Internationalization (i18n)

- [ ] **Multi-language Support:** English, Spanish, French, German
- [ ] **RTL Support:** Right-to-left layout for Arabic, Hebrew
- [ ] **Date/Time Localization:** Use `Intl.DateTimeFormat`
- [ ] **Number Formatting:** Use `Intl.NumberFormat`

## 8. Dark Mode & Theme Support

- [ ] **System Preference Detection:** Use `prefers-color-scheme`
- [ ] **Manual Theme Toggle:** Allow users to override system preference
- [ ] **High Contrast Mode:** Extra contrast option for accessibility
- [ ] **Theme Persistence:** Save preference in localStorage

## 9. Error UX

- [ ] **Friendly Error Messages:** Clear, actionable error descriptions
- [ ] **Error Recovery:** Provide clear paths to resolve errors
- [ ] **Error Boundaries:** Show helpful fallback UI for component failures
- [ ] **Error Logging:** Log errors with user context (sanitized)

## 10. Onboarding & Help

- [ ] **Interactive Tutorial:** Guide users through first analysis
- [ ] **Contextual Help:** Show help icons with tooltips
- [ ] **Keyboard Shortcuts:** Display shortcut hints
- [ ] **Feature Discovery:** Highlight new features on update
