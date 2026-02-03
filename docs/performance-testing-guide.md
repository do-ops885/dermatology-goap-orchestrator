# Performance Testing Guide

**Last Updated:** 2026-02-03  
**Status:** Ready for Testing

---

## Quick Start

```bash
# 1. Run automated tests
./scripts/test-performance.sh

# 2. Open React performance test page
open scripts/test-react-performance.html

# 3. Test Web Vitals in browser
# Navigate to http://localhost:5173
# Open DevTools console (F12)
# Copy/paste scripts/measure-web-vitals.js
```

---

## 1. Automated Testing Suite

### 1.1 Run All Tests

```bash
./scripts/test-performance.sh
```

**What it tests:**
- ✅ Bundle size (< 500 kB main, < 4 MB total)
- ✅ Code splitting (8+ chunks)
- ✅ Build artifacts (source maps, PWA manifest)
- ✅ Server connectivity
- ✅ Lighthouse performance score (target: 90+)

**Expected output:**
```
🚀 Dermatology AI - Performance Testing Suite
==============================================

Step 1: Building production bundle...
✓ PASS: Production build completed successfully

Step 2: Analyzing bundle size...
Main bundle: 485 KB
✓ PASS: Main bundle within budget (485 KB < 500 KB)

Vendor bundles:
  - vendor-react-*.js: 115 KB
  - vendor-charts-*.js: 175 KB
  - vendor-ai-*.js: 445 KB
  - vendor-tfjs-*.js: 1150 KB
Total vendor: 1885 KB
✓ PASS: Total bundle within budget (2370 KB < 4000 KB)

...

Results:
  ✓ Passed:   12
  ✗ Failed:   0
  ⚠ Warnings: 2

All tests passed!
```

### 1.2 Manual Lighthouse Audit

If you don't have Lighthouse installed:

```bash
# Install Lighthouse CLI
npm install -g @lhci/cli lighthouse

# Run audit manually
npm run build
npm run preview &

lighthouse http://localhost:4173 \
  --only-categories=performance,accessibility,best-practices,pwa \
  --output=html \
  --output-path=./lighthouse-report.html \
  --view
```

---

## 2. React Performance Testing

### 2.1 Open Test Page

```bash
# Option 1: Direct file
open scripts/test-react-performance.html

# Option 2: Serve via HTTP
npx serve scripts
# Then open http://localhost:3000/test-react-performance.html
```

### 2.2 Test Suite Overview

**Test 1: React.memo Effectiveness**
- Simulates 100 rapid parent updates
- Checks if memoized components avoid re-renders
- Measures average update time

**Test 2: Lazy Loading**
- Provides manual verification steps
- Lists expected lazy chunks
- Network tab observation guide

**Test 3: useMemo & useCallback**
- Demonstrates memoization benefits
- Shows performance improvement percentage
- Provides app verification steps

**Test 4: Component Render Count**
- Opens app in new tab
- Guides React DevTools usage
- Highlights render behavior

**Test 5: Memory Profiling**
- Shows current memory usage
- Provides heap snapshot guide
- Leak detection steps

### 2.3 Using React DevTools

**Install Extension:**
1. Chrome Web Store: "React Developer Tools"
2. Or Firefox: "React Developer Tools"

**Enable Profiler:**
1. Open your app: http://localhost:5173
2. Open DevTools → Profiler tab
3. Click gear icon → Check "Highlight updates when components render"
4. Perform actions and watch for highlighted components

**Expected behavior:**
- Memoized components: No highlight when parent updates (props unchanged)
- Non-memoized: Highlight on every parent update
- Good: Only necessary updates highlighted

---

## 3. Web Vitals Testing

### 3.1 In-Browser Measurement

```bash
# 1. Start dev server
npm run dev

# 2. Open http://localhost:5173

# 3. Open DevTools Console (F12)

# 4. Copy/paste this script:
```

Then paste the contents of `scripts/measure-web-vitals.js`

**Expected output:**
```
🎯 Web Vitals Measurement Started
Interact with the app to collect metrics...

✅ LCP: 2341.23 (good)
✅ FID: 87.50 (good)
✅ CLS: 0.08 (good)
✅ FCP: 1654.32 (good)
✅ TTFB: 234.12 (good)

⏰ 10 seconds elapsed, exporting report...

📈 Web Vitals Report
===================
✅ LCP: 2341.23 (good)
✅ FID: 87.50 (good)
✅ CLS: 0.08 (good)
✅ FCP: 1654.32 (good)
✅ TTFB: 234.12 (good)

📋 Summary
==========
✅ Good: 5
⚠️ Needs Improvement: 0
❌ Poor: 0
```

### 3.2 Performance Monitor Integration

The app automatically tracks Web Vitals via `services/performanceMonitor.ts`.

**Check in console:**
```javascript
// Get current metrics
const metrics = performanceMonitor.getMetrics();
console.log(metrics);

// Get summary
const summary = performanceMonitor.getSummary();
console.log(summary);

// Export for debugging
const report = performanceMonitor.exportMetrics();
console.log(report);
```

---

## 4. Bundle Size Analysis

### 4.1 Visual Bundle Analyzer

```bash
# Install analyzer
npm install -D rollup-plugin-visualizer

# Add to vite.config.ts (already configured if using Plan 24)
# Build and analyze
npm run build
npm run bundle:analyze
```

**Opens interactive visualization showing:**
- Bundle composition
- Chunk sizes
- Dependency tree
- Largest modules

### 4.2 Command-line Analysis

```bash
# Build
npm run build

# Analyze sizes
du -sh dist/assets/*.js | sort -rh

# Count chunks
ls -1 dist/assets/*.js | wc -l

# Check against budget
MAIN_SIZE=$(find dist/assets -name 'index-*.js' -exec du -k {} \; | awk '{print $1}')
echo "Main bundle: ${MAIN_SIZE} KB"
if [ "$MAIN_SIZE" -lt 500 ]; then
  echo "✓ Within budget"
else
  echo "✗ Over budget"
fi
```

---

## 5. Memory Leak Detection

### 5.1 Heap Snapshot Method

**Steps:**
1. Open app: http://localhost:5173
2. DevTools → Memory tab
3. Take heap snapshot (Snapshot 1)
4. Perform analysis (upload image, wait for results)
5. Take heap snapshot (Snapshot 2)
6. Perform analysis again
7. Take heap snapshot (Snapshot 3)
8. Compare snapshots

**Look for:**
- Detached DOM nodes (should be minimal)
- Tensors not disposed (check for `@tensorflow/tfjs`)
- Event listeners not removed
- Growing arrays/maps

### 5.2 Tensor Memory Monitoring

```javascript
// In browser console
import { tensorMemoryManager } from './services/tensorMemoryManager';

// Get current stats
const stats = tensorMemoryManager.getStats();
console.log('TF.js Memory:', stats.tfMemory);
console.log('Tensor Pools:', stats.pools);

// Log memory usage
tensorMemoryManager.logMemoryUsage();

// Expected output:
// {
//   numTensors: 12,
//   numBytes: 4194304,
//   numBytesInGPU: 0,
//   unreliable: false
// }
```

**Good values:**
- numTensors: Should stabilize after analysis (not grow indefinitely)
- numBytes: Should return to baseline after analysis complete
- Unreliable: false (indicates browser supports memory tracking)

---

## 6. Lazy Loading Verification

### 6.1 Network Tab Method

**Steps:**
1. Open app: http://localhost:5173
2. DevTools → Network tab
3. Filter by "JS"
4. Clear network log (🚫 icon)
5. Upload an image for analysis

**Expected behavior:**
```
Initial load (before analysis):
  ✓ index-[hash].js (main bundle)
  ✓ vendor-react-[hash].js
  ✓ vendor-charts-[hash].js
  ✓ FairnessDashboard-[hash].js (loaded immediately)

During analysis (lazy loaded):
  ✓ AgentFlow-[hash].js (when analysis starts)
  ✓ DiagnosticSummary-[hash].js (when results appear)

On demand:
  ✓ FairnessReport-[hash].js (when clicking "View Report")
```

### 6.2 Coverage Tool

**Steps:**
1. DevTools → More tools → Coverage
2. Click record (⚫)
3. Interact with app
4. Stop recording
5. View unused JavaScript

**Good results:**
- Initial load: < 30% unused code
- After full flow: < 10% unused code

---

## 7. Worker Pool Testing

### 7.1 Verify Worker Creation

```javascript
// In browser console
import { workerPool } from './services/inferenceWorkerPool';

// Get stats
const stats = workerPool.getStats();
console.log(stats);

// Expected:
// {
//   totalWorkers: 4,
//   availableWorkers: 4,
//   pendingTasks: 0,
//   queuedTasks: 0
// }
```

### 7.2 Test Non-blocking Behavior

**Method 1: Performance Tab**
1. DevTools → Performance tab
2. Record while performing analysis
3. Look for "Worker" sections in flame graph
4. Main thread should remain mostly idle during inference

**Method 2: FPS Meter**
1. DevTools → More tools → Rendering
2. Enable "Frame Rendering Stats"
3. Perform analysis
4. FPS should stay near 60 (not drop to < 30)

---

## 8. Interpreting Results

### 8.1 Performance Score Breakdown

**Lighthouse Performance Score (0-100):**

| Range | Rating | Action |
|:------|:-------|:-------|
| 90-100 | Excellent | ✅ No action needed |
| 70-89 | Good | ⚠️ Minor optimizations |
| 50-69 | Needs Improvement | ⚠️ Optimization required |
| 0-49 | Poor | ❌ Critical issues |

**Key Metrics:**

**LCP (Largest Contentful Paint):**
- Good: < 2.5s
- Needs Improvement: 2.5s - 4s
- Poor: > 4s

**FID (First Input Delay):**
- Good: < 100ms
- Needs Improvement: 100ms - 300ms
- Poor: > 300ms

**CLS (Cumulative Layout Shift):**
- Good: < 0.1
- Needs Improvement: 0.1 - 0.25
- Poor: > 0.25

### 8.2 Bundle Size Targets

**Main Bundle:**
- ✅ Excellent: < 400 kB
- ✅ Good: 400-500 kB
- ⚠️ Acceptable: 500-600 kB
- ❌ Too Large: > 600 kB

**Total Bundle:**
- ✅ Excellent: < 3 MB
- ✅ Good: 3-4 MB
- ⚠️ Acceptable: 4-5 MB
- ❌ Too Large: > 5 MB

### 8.3 Memory Usage Targets

**JavaScript Heap:**
- ✅ Good: < 50 MB
- ⚠️ Acceptable: 50-100 MB
- ❌ High: > 100 MB

**TensorFlow.js:**
- ✅ Good: < 20 tensors after cleanup
- ⚠️ Acceptable: 20-50 tensors
- ❌ Leak suspected: > 50 tensors and growing

---

## 9. Troubleshooting

### 9.1 Bundle Size Over Budget

**Diagnosis:**
```bash
npm run bundle:analyze
```

**Common causes:**
- Large dependencies not tree-shaken
- Duplicate dependencies
- Unused code not removed

**Solutions:**
- Use dynamic imports for large libs
- Check for duplicate packages: `npm ls [package]`
- Enable tree-shaking in build config

### 9.2 Poor LCP Score

**Diagnosis:**
- Check Network tab for slow resources
- Use Lighthouse "View Trace" button

**Common causes:**
- Large images not optimized
- Render-blocking resources
- Slow server response

**Solutions:**
- Optimize images (WebP, lazy loading)
- Preload critical resources
- Use CDN for static assets

### 9.3 High CLS Score

**Diagnosis:**
- Enable "Layout Shift Regions" in Rendering panel
- Look for elements loading late

**Common causes:**
- Images without dimensions
- Ads/embeds loading dynamically
- Fonts causing layout shift

**Solutions:**
- Add width/height to images
- Reserve space for dynamic content
- Use font-display: swap

### 9.4 Memory Leaks

**Diagnosis:**
```javascript
// Take 3 heap snapshots with analysis in between
// Compare "Detached" elements

// Check tensor count
tf.memory().numTensors
```

**Common causes:**
- Event listeners not removed
- Tensors not disposed
- React components not unmounting properly

**Solutions:**
- Add cleanup in useEffect
- Use tensorMemoryManager.tidy()
- Check ErrorBoundary implementations

---

## 10. CI/CD Integration

### 10.1 GitHub Actions

**Workflows created:**
- `.github/workflows/bundle-size.yml` - Checks bundle size on every PR
- `.github/workflows/lighthouse.yml` - Runs Lighthouse audit on every PR

**View results:**
1. Go to PR → "Checks" tab
2. Click "Bundle Size Check" or "Lighthouse CI"
3. View logs and artifacts

### 10.2 Local Pre-commit Checks

```bash
# Add to .husky/pre-commit
npm run build
npm run bundle:size
```

---

## 11. Performance Checklist

### Before Deployment

- [ ] Bundle size within budget (< 500 kB main)
- [ ] Lighthouse score > 90
- [ ] All Web Vitals in "good" range
- [ ] No memory leaks detected
- [ ] Lazy loading working correctly
- [ ] React DevTools shows minimal re-renders
- [ ] Worker pool functioning
- [ ] CI checks passing

### After Deployment

- [ ] Monitor real user metrics
- [ ] Check analytics for slow pages
- [ ] Review error logs for performance issues
- [ ] A/B test optimizations if possible

---

## 12. Next Steps

**Immediate:**
1. Run `./scripts/test-performance.sh`
2. Review Lighthouse report
3. Test Web Vitals in browser
4. Check bundle size breakdown

**Optimization:**
1. Address any failed tests
2. Optimize assets flagged by Lighthouse
3. Implement preloading for critical resources
4. Add service worker for offline caching

**Monitoring:**
1. Setup Real User Monitoring (RUM)
2. Configure performance alerts
3. Track Web Vitals in production
4. Regular performance audits

---

## Resources

**Tools:**
- Lighthouse: https://developers.google.com/web/tools/lighthouse
- Web Vitals: https://web.dev/vitals/
- React DevTools: https://react.dev/learn/react-developer-tools
- Bundle Analyzer: https://github.com/btd/rollup-plugin-visualizer

**Documentation:**
- `plans/24_performance_optimization_strategy.md` - Strategy
- `plans/31_performance_optimization_implementation_summary.md` - Implementation
- `services/performanceMonitor.ts` - Monitoring code
- `components/LazyComponents.tsx` - Lazy loading utilities

---

_Last Updated: 2026-02-03_  
_Status: Ready for Testing_
