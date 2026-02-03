# Performance Optimization Strategy

**Agent:** Performance-Engineer 🚀  
**Status:** ACTIVE  
**Last Updated:** 2026-02-03  
**Priority:** HIGH

---

## 1. Executive Summary

Comprehensive performance optimization strategy for the Dermatology AI Orchestrator focusing on runtime performance, bundle size reduction, memory efficiency, and user experience metrics.

**Current Performance Baseline:**

- Main bundle: ~500 kB (gzipped)
- Vendor bundles: ~3 MB (AI/ML models)
- LCP (Largest Contentful Paint): Target < 2.5s
- FID (First Input Delay): Target < 100ms
- TTI (Time to Interactive): Target < 3.5s

---

## 2. Bundle Optimization

### 2.1 Current State Analysis

**Bundle Composition (from vite.config.ts):**

- `vendor-react`: React, ReactDOM, Framer Motion
- `vendor-charts`: Recharts visualization library
- `vendor-ai-core`: Google GenAI, AgentDB, Transformers
- `vendor-tfjs`: TensorFlow.js + WebGPU backend
- `vendor-webllm`: WebLLM runtime (largest chunk)
- `vendor-utils`: Lucide icons, Buffer, Process polyfills

### 2.2 Optimization Strategies

#### 2.2.1 Code Splitting Enhancements

```typescript
// Implement route-based code splitting
const DiagnosticSummary = lazy(() => import('./components/DiagnosticSummary'));
const FairnessDashboard = lazy(() => import('./components/FairnessDashboard'));

// Implement conditional loading for heavy dependencies
const loadTensorFlow = async () => {
  if (shouldUseTFJS) {
    return await import('@tensorflow/tfjs');
  }
  return null;
};
```

#### 2.2.2 Tree Shaking Improvements

- [ ] Verify all imports use ES6 module syntax
- [ ] Remove unused exports from utility modules
- [ ] Use named imports instead of namespace imports
- [ ] Configure Rollup to eliminate dead code

#### 2.2.3 Dynamic Import Strategy

```typescript
// Load ML models only when needed
const visionModel = await import(
  /* webpackChunkName: "vision-model" */
  './services/vision'
);

// Lazy load analytics charts
const analytics = await import(
  /* webpackChunkName: "analytics" */
  './components/FairnessDashboard'
);
```

### 2.3 Bundle Size Monitoring

**Implementation:**

```json
{
  "size-limit": [
    {
      "path": "dist/assets/index-*.js",
      "limit": "500 kB",
      "gzip": true,
      "name": "Main application bundle"
    },
    {
      "path": "dist/assets/vendor-*.js",
      "limit": "3 MB",
      "gzip": true,
      "name": "Vendor bundles (AI/ML models)"
    }
  ]
}
```

**CI Integration:**

```yaml
- name: Check Bundle Size
  run: npm run bundle:size

- name: Analyze Bundle Composition
  run: npm run bundle:analyze
```

---

## 3. Runtime Performance Optimization

### 3.1 React Performance

#### 3.1.1 Memoization Strategy

```typescript
// Memoize expensive computations
const processedData = useMemo(() => {
  return computeIntensiveOperation(rawData);
}, [rawData]);

// Memoize callback functions
const handleAnalysis = useCallback((image: File) => {
  return analyzeImage(image);
}, []);

// Memoize components that receive complex props
const MemoizedChart = memo(FairnessChart, (prev, next) => {
  return prev.data === next.data && prev.config === next.config;
});
```

#### 3.1.2 Virtual Scrolling

```typescript
// For large lists of similar cases
import { FixedSizeList } from 'react-window';

const SimilarCasesList = ({ cases }) => (
  <FixedSizeList
    height={600}
    itemCount={cases.length}
    itemSize={120}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <CaseCard case={cases[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

#### 3.1.3 Concurrent Rendering

```typescript
// Use React 19's concurrent features
import { startTransition } from 'react';

const handleLargeUpdate = (data) => {
  startTransition(() => {
    setLargeDataset(data);
  });
};
```

### 3.2 ML Model Performance

#### 3.2.1 Model Loading Optimization

```typescript
// Preload critical models on hover
const preloadModels = () => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = '/models/mobilenet-v2.json';
  document.head.appendChild(link);
};

// Progressive model loading
const loadModelProgressively = async () => {
  // Load lightweight model first
  await loadFastModel();
  setModelReady(true);

  // Load heavy model in background
  loadAccurateModel().then(() => {
    setAdvancedModelReady(true);
  });
};
```

#### 3.2.2 Inference Optimization

```typescript
// Batch processing for multiple images
const processBatch = async (images: File[]) => {
  const tensors = await Promise.all(images.map((img) => preprocessImage(img)));

  const results = tf.tidy(() => {
    const batch = tf.stack(tensors);
    return model.predict(batch);
  });

  return results;
};

// Web Worker for heavy computations
const worker = new Worker('./workers/inference.worker.js');
worker.postMessage({ image: imageData });
```

#### 3.2.3 Memory Management

```typescript
// Implement tensor pooling
class TensorPool {
  private pool = new Map<string, tf.Tensor[]>();

  acquire(shape: number[], dtype: string): tf.Tensor {
    const key = `${shape.join(',')}_${dtype}`;
    const available = this.pool.get(key);

    if (available && available.length > 0) {
      return available.pop()!;
    }

    return tf.zeros(shape, dtype);
  }

  release(tensor: tf.Tensor, shape: number[], dtype: string): void {
    const key = `${shape.join(',')}_${dtype}`;
    const pool = this.pool.get(key) || [];
    pool.push(tensor);
    this.pool.set(key, pool);
  }
}
```

---

## 4. Network Performance

### 4.1 Resource Loading Strategy

#### 4.1.1 Critical Resource Prioritization

```html
<!-- Preconnect to external APIs -->
<link rel="preconnect" href="https://generativelanguage.googleapis.com" />
<link rel="dns-prefetch" href="https://storage.googleapis.com" />

<!-- Preload critical resources -->
<link rel="preload" href="/assets/main.js" as="script" />
<link rel="preload" href="/assets/main.css" as="style" />
```

#### 4.1.2 Service Worker Caching Strategy

```typescript
// sw.js enhancements
const CACHE_STRATEGY = {
  models: 'cache-first', // ML models (large, rarely change)
  api: 'network-first', // API calls (fresh data priority)
  assets: 'stale-while-revalidate', // Static assets (balance)
  images: 'cache-first', // User uploaded images
};

self.addEventListener('fetch', (event) => {
  const { url } = event.request;

  if (url.includes('/models/')) {
    event.respondWith(cacheFirst(event.request));
  } else if (url.includes('/api/')) {
    event.respondWith(networkFirst(event.request));
  } else {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
```

### 4.2 API Optimization

#### 4.2.1 Request Batching

```typescript
class RequestBatcher {
  private queue: Request[] = [];
  private timer: NodeJS.Timeout | null = null;

  add(request: Request): Promise<Response> {
    this.queue.push(request);

    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), 50);
    }

    return request.promise;
  }

  private async flush(): Promise<void> {
    const batch = this.queue.splice(0);
    const response = await fetch('/api/batch', {
      method: 'POST',
      body: JSON.stringify(batch.map((r) => r.data)),
    });

    // Distribute responses to individual requests
    const results = await response.json();
    batch.forEach((req, i) => req.resolve(results[i]));
  }
}
```

#### 4.2.2 Response Caching

```typescript
// Implement smart caching for similar requests
const responseCache = new Map<string, CachedResponse>();

const fetchWithCache = async (url: string, options: RequestInit) => {
  const cacheKey = generateCacheKey(url, options);
  const cached = responseCache.get(cacheKey);

  if (cached && !isStale(cached)) {
    return cached.data;
  }

  const response = await fetch(url, options);
  const data = await response.json();

  responseCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl: 5 * 60 * 1000, // 5 minutes
  });

  return data;
};
```

---

## 5. Rendering Performance

### 5.1 CSS Optimization

#### 5.1.1 Critical CSS Extraction

```typescript
// vite.config.ts
import criticalCSS from 'vite-plugin-critical-css';

export default defineConfig({
  plugins: [
    criticalCSS({
      inline: true,
      minify: true,
      extract: true,
    }),
  ],
});
```

#### 5.1.2 Tailwind Optimization

```javascript
// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Only include used animations
      animation: {
        spin: 'spin 1s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  // Purge unused styles
  purge: {
    enabled: true,
    content: ['./src/**/*.tsx'],
  },
};
```

### 5.2 Image Optimization

#### 5.2.1 Progressive Image Loading

```typescript
const OptimizedImage = ({ src, alt }: ImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [placeholder, setPlaceholder] = useState('');

  useEffect(() => {
    // Load blur placeholder first
    const thumb = generateBlurHash(src);
    setPlaceholder(thumb);

    // Load full image
    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
  }, [src]);

  return (
    <div className="relative">
      {!loaded && <img src={placeholder} className="blur-xl" />}
      <img
        src={src}
        alt={alt}
        className={`transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};
```

#### 5.2.2 Image Format Selection

```typescript
const selectOptimalFormat = (userAgent: string) => {
  if (supportsWebP(userAgent)) return 'webp';
  if (supportsAVIF(userAgent)) return 'avif';
  return 'jpeg';
};

// Serve modern formats with fallbacks
<picture>
  <source srcSet="image.avif" type="image/avif" />
  <source srcSet="image.webp" type="image/webp" />
  <img src="image.jpg" alt="Fallback" />
</picture>
```

---

## 6. Performance Monitoring

### 6.1 Web Vitals Integration

```typescript
// services/reportWebVitals.ts enhancements
import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

export const reportWebVitals = (onPerfEntry?: (metric: any) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onCLS(onPerfEntry);
    onFID(onPerfEntry);
    onFCP(onPerfEntry);
    onLCP(onPerfEntry);
    onTTFB(onPerfEntry);
    onINP(onPerfEntry); // New in Chrome 96+
  }
};

// Send metrics to analytics
const sendToAnalytics = (metric: Metric) => {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  });

  // Use sendBeacon for reliability
  navigator.sendBeacon('/analytics', body);
};
```

### 6.2 Performance Budget Enforcement

```yaml
# .github/workflows/performance.yml
name: Performance Budget

on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Audit with Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:5173
          budgetPath: ./budget.json
          uploadArtifacts: true
```

```json
// budget.json
{
  "budget": [
    {
      "resourceSizes": [
        { "resourceType": "script", "budget": 600 },
        { "resourceType": "stylesheet", "budget": 100 },
        { "resourceType": "image", "budget": 200 },
        { "resourceType": "total", "budget": 4000 }
      ],
      "timings": [
        { "metric": "first-contentful-paint", "budget": 2000 },
        { "metric": "largest-contentful-paint", "budget": 2500 },
        { "metric": "interactive", "budget": 3500 },
        { "metric": "cumulative-layout-shift", "budget": 0.1 }
      ]
    }
  ]
}
```

---

## 7. Database and Storage Optimization

### 7.1 IndexedDB Performance

```typescript
// Optimize AgentDB queries
class OptimizedAgentDB {
  async batchInsert(records: Record[]): Promise<void> {
    const tx = this.db.transaction(['cases'], 'readwrite');
    const store = tx.objectStore('cases');

    // Use Promise.all for parallel inserts
    await Promise.all(records.map((record) => store.add(record)));

    await tx.complete;
  }

  // Index optimization
  async createIndices(): Promise<void> {
    const store = this.db.createObjectStore('cases', { keyPath: 'id' });
    store.createIndex('skinTone', 'skinTone', { unique: false });
    store.createIndex('diagnosis', 'diagnosis', { unique: false });
    store.createIndex('timestamp', 'timestamp', { unique: false });
  }

  // Query optimization
  async queryWithIndex(indexName: string, value: string): Promise<Record[]> {
    const tx = this.db.transaction(['cases'], 'readonly');
    const index = tx.objectStore('cases').index(indexName);
    return await index.getAll(value);
  }
}
```

### 7.2 Caching Strategy

```typescript
// Multi-tier caching
class CacheManager {
  private memoryCache = new Map<string, any>();
  private idbCache: IDBDatabase;

  async get(key: string): Promise<any> {
    // L1: Memory cache (fastest)
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // L2: IndexedDB (medium)
    const idbValue = await this.getFromIDB(key);
    if (idbValue) {
      this.memoryCache.set(key, idbValue);
      return idbValue;
    }

    // L3: Network (slowest)
    const networkValue = await fetch(`/api/${key}`);
    await this.setInIDB(key, networkValue);
    this.memoryCache.set(key, networkValue);
    return networkValue;
  }
}
```

---

## 8. Implementation Priorities

### 8.1 Phase 1: Quick Wins (Week 1)

- [ ] Enable React.memo for expensive components
- [ ] Implement code splitting for routes
- [ ] Add bundle size monitoring to CI
- [ ] Enable Vite build optimizations
- [ ] Configure aggressive tree shaking

### 8.2 Phase 2: Infrastructure (Week 2)

- [ ] Implement Web Worker for ML inference
- [ ] Setup performance monitoring pipeline
- [ ] Add Lighthouse CI integration
- [ ] Optimize service worker caching
- [ ] Implement request batching

### 8.3 Phase 3: Advanced Optimizations (Week 3-4)

- [ ] Implement tensor pooling
- [ ] Add progressive model loading
- [ ] Optimize IndexedDB queries
- [ ] Setup CDN for static assets
- [ ] Implement advanced image optimization

---

## 9. Success Metrics

### 9.1 Performance Targets

| Metric           | Current | Target   | Status        |
| :--------------- | :------ | :------- | :------------ |
| **LCP**          | TBD     | < 2.5s   | 🟡 Pending    |
| **FID**          | TBD     | < 100ms  | 🟡 Pending    |
| **CLS**          | TBD     | < 0.1    | 🟡 Pending    |
| **TTI**          | TBD     | < 3.5s   | 🟡 Pending    |
| **Main Bundle**  | ~500 kB | < 500 kB | 🟢 On Target  |
| **Total Bundle** | ~3.5 MB | < 3 MB   | 🟡 Needs Work |

### 9.2 Monitoring Dashboard

```typescript
// Create performance dashboard
const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState<WebVitalsMetrics>();

  useEffect(() => {
    reportWebVitals((metric) => {
      setMetrics(prev => ({
        ...prev,
        [metric.name]: metric
      }));
    });
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard
        name="LCP"
        value={metrics?.LCP}
        threshold={2500}
      />
      <MetricCard
        name="FID"
        value={metrics?.FID}
        threshold={100}
      />
      <MetricCard
        name="CLS"
        value={metrics?.CLS}
        threshold={0.1}
      />
    </div>
  );
};
```

---

## 10. Documentation and Best Practices

### 10.1 Performance Guidelines

**For Developers:**

1. Always use `React.memo` for components with complex props
2. Wrap expensive computations in `useMemo`
3. Use `useCallback` for event handlers passed as props
4. Implement virtual scrolling for lists > 50 items
5. Lazy load components not visible on initial render
6. Always dispose TensorFlow.js tensors after use
7. Batch database operations when possible

**For Code Reviews:**

- Check for missing memoization
- Verify tensor cleanup in ML operations
- Ensure proper code splitting
- Review bundle impact of new dependencies

### 10.2 Performance Testing Checklist

- [ ] Run Lighthouse audit on PR
- [ ] Verify bundle size within budget
- [ ] Check Web Vitals scores
- [ ] Test on 3G network simulation
- [ ] Verify offline functionality
- [ ] Check memory usage over time
- [ ] Profile React component rendering

---

## 11. Related Plans

- **02_edge_ml_implementation.md**: ML model optimization strategies
- **03_devops_workflow.md**: CI/CD integration for performance monitoring
- **06_reliability_observability.md**: Monitoring and alerting infrastructure

---

_Agent: Performance-Engineer 🚀_  
_Next Review: 2026-02-10_
