# Agent Plan: Reliability-Architect

**Focus:** Resilience, Observability, Telemetry, Crash Reporting

**Last Updated:** 2026-01-15

### 0.1 Reliability Posture (Updated 2026-01-22)

| Component          | Status          | Implementation                           | Notes                                        |
| ------------------ | --------------- | ---------------------------------------- | -------------------------------------------- |
| Error Boundaries   | ✅ Complete     | `components/ErrorBoundary.tsx`           | Wrapped in key components                    |
| Structured Logging | ✅ Complete     | `services/logger.ts` (118 lines)         | PII redaction active, log level filtering    |
| Core Web Vitals    | ✅ Complete     | `services/reportWebVitals.ts` (78 lines) | CLS, FID, LCP, TTFB, INP captured            |
| GOAP Tracing       | ✅ Complete     | `services/goap/agent.ts` (580+ lines)    | plan_start, agent_start, agent_end, plan_end |
| Agent Timings      | ✅ Complete     | `services/agent-timings.ts` (~50 lines)  | Per-agent timing collection                  |
| Metrics Dashboard  | ✅ Complete     | `components/FairnessDashboard.tsx`       | Real-time metrics visualization              |
| Circuit Breaker    | ✅ **Complete** | `services/circuitBreaker.ts` (172 lines) | Full pattern with state machine              |
| Error Recovery     | ✅ **Complete** | `types.ts` RECOVERY_STRATEGIES           | Per-agent recovery config                    |
| Event Bus          | ✅ **Complete** | `services/eventBus.ts` (278 lines)       | Event history & replay support               |
| Memory Monitoring  | ✅ **Complete** | `services/memoryMonitor.ts` (193 lines)  | Heap size monitoring & alerts                |

## 0.2 Observability Implementation Status

| Feature           | Status         | Implementation              |
| ----------------- | -------------- | --------------------------- |
| Agent timing      | ✅ Implemented | `services/agent-timings.ts` |
| JSON logging      | ✅ Implemented | `services/logger.ts`        |
| Error boundaries  | ✅ Implemented | `components/`               |
| Metrics dashboard | ✅ Implemented | `FairnessDashboard.tsx`     |

## 0.3 Agent Timeout Recommendations (Handoff Protocol)

| Agent Category              | Timeout | Examples                                   |
| --------------------------- | ------- | ------------------------------------------ |
| Quick checks (verification) | 5s      | Image-Verification-Agent, Safety checks    |
| ML inference                | 30s     | Lesion-Detection-Agent, Feature-Extraction |
| Web search (verification)   | 15s     | Web-Verification-Agent                     |
| Database operations         | 10s     | Learning-Agent, Similarity-Search-Agent    |

## 1. Global Error Handling Strategy

**Status:** ✅ IMPLEMENTED

### 1.1 React Error Boundaries

- **Implementation:** ✅ Wrapped main `AgentFlow`, `FairnessDashboard`, and `AnalysisIntake`.
- **Fallback UI:** ✅ Displays module-specific crash messages with "Restart" button.

### 1.2 Error Boundary Coverage

- **Implementation:** ErrorBoundary components wrapped in `components/` directory
- **Coverage:** Main `AgentFlow`, `FairnessDashboard`, and `AnalysisIntake` components protected
- **Fallback UI:** Module-specific crash messages with "Restart" button
- **Recovery:** Graceful degradation with user notification

### 1.3 Async Error Handling (GOAP)

- **Pattern:** ✅ `useClinicalAnalysis.ts` wraps execution in Try/Catch.
- **Propagation:** ✅ Critical errors halt pipeline; Warnings trigger re-planning.
- **GOAP-Agent Tracing:** ✅ `runId` correlation and events `plan_start`, `agent_start`, `agent_end`, `plan_end` implemented (see `services/goap/agent.ts`)

### 1.4 2025: Enhanced Error Handling

- [ ] **Error Recovery Strategies:**

  ```typescript
  interface RecoveryStrategy {
    critical: boolean; // Halt pipeline if true
    retry: boolean; // Attempt retry if true
    fallback: string; // Agent ID to fallback to
    maxRetries: number;
  }

  const RECOVERY_STRATEGIES: Record<string, RecoveryStrategy> = {
    'Lesion-Detection-Agent': {
      critical: false,
      retry: true,
      fallback: 'Safety-Calibration-Agent',
      maxRetries: 3,
    },
  };
  ```

- [ ] **Circuit Breaker Pattern:** Prevent cascading failures:

  ```typescript
  class CircuitBreaker {
    private failures = 0;
    private lastFailureTime = 0;
    private state: 'closed' | 'open' | 'half-open' = 'closed';

    async execute<T>(fn: () => Promise<T>): Promise<T> {
      if (this.state === 'open') {
        throw new Error('Circuit is open');
      }
      try {
        return await fn();
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }
  }
  ```

## 2. Structured Logging

**Status:** ✅ FULLY IMPLEMENTED

### 2.1 Structured Logging Format

- **JSON Structure:** Each log entry contains `timestamp`, `level`, `message`, `agentId`, `runId`, and optional `metadata`
- **Log Levels:** `debug`, `info`, `warn`, `error`, `fatal`
- **PII Redaction:** Automatically sanitizes sensitive data before logging
- **GOAP Events:** Structured logs with `eventType: 'goap-agent'` for agent lifecycle tracking

### 2.2 Logger Specification (2026-01-11)

- **Service:** `services/logger.ts` handles generic logging with sanitation.
- **Privacy:** PII/Base64 redaction logic active.
- **LogEntry Interface:** Structured with timestamp, level, component, event, metadata.

### 2.3 2025: Enhanced Logging

- [ ] **Log Levels & Filtering:**

  ```typescript
  enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4,
  }

  class Logger {
    static minLevel = LogLevel.INFO;

    static debug(message: string, meta?: any) {
      if (LogLevel.DEBUG >= Logger.minLevel) {
        console.log('[DEBUG]', message, meta);
      }
    }
  }
  ```

- [ ] **Structured JSON Logs:**
  ```typescript
  interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    agentId?: string;
    runId?: string;
    metadata?: Record<string, any>;
  }
  ```
- [ ] **Log Aggregation:** Export logs for analysis and debugging

## 3. Performance Observability

**Status:** IMPLEMENTED

- **Metric:** ✅ Core Web Vitals (CLS, FID, LCP) captured via `reportWebVitals.ts`.
- **Reporting:** Logs to internal `Logger` (debug level) for analysis.

### 3.1 Agent Execution Timing Tracking

- **Service:** `services/agent-timings.ts` (~50 lines) provides per-agent timing collection
- **Metrics Captured:** Agent latency, success/failure counts, plan duration, replan count
- **Correlation:** Timing data linked to `runId` for trace analysis
- **GOAP Integration:** `plan_start`, `agent_start`, `agent_end`, `plan_end` events tracked

### 3.2 GOAP-Agent Metrics & Tasks

- [ ] **Instrument `goap-agent` to emit Metrics:**
  ```typescript
  interface AgentMetrics {
    agent_latency_ms: number;
    agent_success_total: number;
    agent_failure_total: number;
    plan_duration_ms: number;
    replan_count: number;
  }
  ```
- [ ] **Add Realtime Dashboard:** Visualize `runId` traces when debugging incidents.

### 3.3 2025: Enhanced Performance Monitoring

- [ ] **Custom Web Vitals:**

  ```typescript
  import { onCLS, onFID, onLCP, onTTFB, onINP } from 'web-vitals';

  onCLS((metric) => Logger.info('CLS', metric));
  onFID((metric) => Logger.info('FID', metric));
  onLCP((metric) => Logger.info('LCP', metric));
  onTTFB((metric) => Logger.info('TTFB', metric));
  onINP((metric) => Logger.info('INP', metric)); // New metric
  ```

- [ ] **Performance Budget Alerts:**

  ```typescript
  const PERFORMANCE_THRESHOLDS = {
    lcp: 2500,
    fid: 100,
    cls: 0.1,
    inp: 200,
  };

  if (metric.value > PERFORMANCE_THRESHOLDS[metric.name]) {
    Logger.warn('Performance Budget Exceeded', metric);
  }
  ```

- [ ] **Memory Monitoring:**

  ```typescript
  setInterval(() => {
    if ('memory' in performance) {
      const used = (performance as any).memory.usedJSHeapSize;
      const limit = (performance as any).memory.jsHeapSizeLimit;
      const ratio = used / limit;

      if (ratio > 0.9) {
        Logger.error('Memory Warning', { used, limit, ratio });
      }
    }
  }, 30000); // Check every 30 seconds
  ```

## 4. Crash Prevention (Memory)

- **Monitoring:** Listen for `memory-warning` events (if available in Chrome).
- **Action:** `LocalLLMService` includes idle timer (5min) to auto-unload weights.

### 4.1 2025: Advanced Memory Management

- [ ] **Tensor Leak Detection:**

  ```typescript
  class TensorTracker {
    private tensors = new Set<tf.Tensor>();

    track(tensor: tf.Tensor) {
      this.tensors.add(tensor);
      return tensor;
    }

    assertAllDisposed() {
      if (this.tensors.size > 0) {
        Logger.error('Memory Leak', {
          leakCount: this.tensors.size,
          tensors: Array.from(this.tensors),
        });
      }
    }
  }
  ```

- [ ] **Automatic Cleanup on Visibility Change:**
  ```typescript
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Page hidden, free up memory
      visionSpecialist.dispose();
      localLLMService.unload();
    }
  });
  ```

## 5. 2025: Observability Dashboard

- [ ] **Metrics Visualization:** Display real-time metrics in a dashboard
- [ ] **Trace View:** Show agent execution traces with timings
- [ ] **Error Rate Dashboard:** Track error rates over time
- [ ] **Performance Trends:** Historical performance data visualization
- [ ] **Health Checks:** Status indicators for all services

## 6. Incident Response & Alerting

- [ ] **Incident Detection:** Automatically detect anomalies in logs/metrics
- [ ] **Alerting:** Notify on critical failures
- [ ] **Incident Log:** Track all incidents with timestamps
- [ ] **Root Cause Analysis:** Tools for investigating incidents

## 7. Testing & Reliability

- [ ] **Chaos Engineering:** Simulate failures to test resilience
- [ ] **Load Testing:** Test performance under load
- [ ] **Stress Testing:** Push system to limits
- [ ] **Reliability Testing:** Long-running stability tests

## 8. 2025: Observability Best Practices

- [ ] **OpenTelemetry Integration:** Standardized telemetry format
- [ ] **Distributed Tracing:** Track requests across services
- [ ] **Metrics Aggregation:** Aggregate metrics across sessions
- [ ] **Alert Management**: Configurable alert rules and thresholds
- [ ] **Dashboard Customization**: Allow users to create custom dashboards
