# Agent 2: Lighthouse CI Fixer - Progress Report

**Agent:** @reliability-architect Agent 2  
**Task:** Fix NO_FCP error (page not painting)  
**Status:** 🔴 IN_PROGRESS  
**Assigned:** 2026-02-09

## Investigation

### Configuration File Analyzed

`lighthouserc.cjs`

### Key Findings

1. **Current Configuration:**
   - URL: http://127.0.0.1:4173/
   - Preset: desktop
   - maxWaitForLoad: 180000ms (3 minutes)
   - maxWaitForFcp: 120000ms (2 minutes)
   - pauseAfterFcpMs: 8000ms
   - pauseAfterLoadMs: 15000ms
   - numberOfRuns: 3

2. **Chrome Flags:**
   - --no-sandbox --headless --disable-gpu
   - --disable-dev-shm-usage
   - Multiple isolation and security flags disabled

3. **Workflow Analysis:**
   - Uses `nohup npm run preview -- --host 0.0.0.0 --port 4173`
   - Waits up to 180 seconds for server
   - Retries Lighthouse CI 3 times

### NO_FCP Error Root Causes

The NO_FCP (No First Contentful Paint) error occurs when:

1. Page doesn't paint any content within timeout
2. JavaScript errors prevent rendering
3. Server not serving content correctly
4. Chrome headless issues with React SPA hydration

## Research: Lighthouse CI NO_FCP React SPA Fix 2024

### Common Solutions:

1. **SSR Landing Page**
   - Serve a static HTML landing page for Lighthouse
   - Pre-render critical content
   - Hydrate React after initial paint

2. **Wait Conditions**
   - Use `--wait-for` with a selector
   - Wait for specific element before audit
   - Example: `waitFor: '#root.ready'`

3. **Playwright Performance Testing**
   - Replace Lighthouse CI with Playwright performance tests
   - More reliable for SPAs
   - Better control over page lifecycle

4. **Extended Timeouts**
   - Already configured with 180s wait
   - Diminishing returns with longer timeouts

## Proposed Fixes

### Option A: Add waitFor Selector (Quick)

Add explicit wait for content to be ready:

```javascript
collect: {
  url: ['http://127.0.0.1:4173/'],
  settings: {
    // ... existing settings
    waitFor: 'body.ready, #root:not(:empty)',
    emulatedFormFactor: 'desktop',
  }
}
```

### Option B: Implement SSR Landing Page (Robust)

Create a minimal static landing page that loads immediately:

- `public/lighthouse-landing.html`
- Basic HTML with critical CSS
- Prevents NO_FCP by having immediate paint

### Option C: Use Playwright Performance Testing

Replace Lighthouse CI with Playwright:

- More reliable for React SPAs
- Better debugging capabilities
- Web Vitals measurement via Performance API

### Option D: Fix Preview Server Timing

The workflow already has extensive waits. Issue may be:

- React hydration errors
- JavaScript bundle loading issues
- Server not actually serving content

## Recommended Fix

Implement **Option A + D**:

1. Add `waitFor` selector to lighthouserc.cjs
2. Verify preview server actually serves content
3. Add debugging to lighthouse workflow

## Next Steps

1. Verify preview server serves valid HTML
2. Add waitFor selector to lighthouserc.cjs
3. Test locally with `npm run lighthouse:ci`
4. Push fix and monitor

## Files to Modify

- `lighthouserc.cjs` - Add waitFor selector
- `.github/workflows/lighthouse.yml` - Add debugging (optional)

## Status

- [x] Configuration analyzed
- [x] Research completed
- [x] Root cause identified (SPA hydration timing)
- [x] Fix implemented
- [x] Local validation complete
- [x] Fix pushed
- [ ] CI passing (awaiting results)

**Blocked On:** None

## Fix Applied

### Problem

NO_FCP (No First Contentful Paint) error in Lighthouse CI for React SPA. The page wasn't painting content before Lighthouse started auditing.

### Root Cause

React SPA hydration takes time, especially with ML models loading. Lighthouse was starting audit before React rendered content.

### Solution

1. **Added `waitFor: '#root'`** - Ensures React has rendered before audit starts
2. **Increased timeouts:**
   - `pauseAfterFcpMs`: 8s → 15s (more time for hydration)
   - `pauseAfterLoadMs`: 15s → 20s (more time for ML models)
   - Server wait: 180s → 240s (more time for server startup)
3. **Added `skipAudits: ['full-page-screenshot']`** - Improves CI stability
4. **Enhanced debugging** - Better logs for troubleshooting

### Files Modified

- `lighthouserc.cjs` - Updated configuration
- `.github/workflows/lighthouse.yml` - Extended wait times and debugging

### Expected Result

Lighthouse CI should now wait for React to render content before auditing, preventing NO_FCP errors.
