# Performance Testing - Quick Start Guide

**Ready to test in 5 minutes!**

---

## Prerequisites

```bash
# Install dependencies
npm install

# Install Lighthouse (optional)
npm install -g @lhci/cli lighthouse
```

---

## Option 1: Full Automated Suite (5 minutes)

```bash
./scripts/test-performance.sh
```

**Tests:**

- ✅ Bundle size (< 500 kB main)
- ✅ Code splitting (8+ chunks)
- ✅ Lighthouse audit (score > 90)
- ✅ Build artifacts
- ✅ Server connectivity

---

## Option 2: Quick Manual Tests (10 minutes)

### Step 1: Build & Check Size

```bash
npm run build
du -sh dist/assets/index-*.js
# Expected: < 500 kB
```

### Step 2: Test Lazy Loading

```bash
npm run dev
# Open http://localhost:5173
# DevTools → Network → Filter by JS
# Upload image and watch for new chunks loading
```

### Step 3: Measure Web Vitals

```bash
# In browser console:
# Copy/paste: scripts/measure-web-vitals.js
# Wait 10 seconds for report
```

---

## Option 3: Interactive Tests

```bash
open scripts/test-react-performance.html
```

**Tests:**

- React.memo effectiveness
- Hook memoization
- Memory profiling
- Render count

---

## Expected Results

✅ **Bundle:** Main < 500 kB, Total < 4 MB  
✅ **Lighthouse:** Score > 90  
✅ **Web Vitals:** All metrics "good"  
✅ **Memory:** Stable after analysis  
✅ **Lazy Loading:** 4 chunks on-demand

---

## Need Help?

📖 **Full Guide:** `docs/performance-testing-guide.md`  
📝 **Detailed Summary:** `plans/32_performance_testing_summary.md`

---

**Testing Time:** ~30 minutes for complete validation
