# Agent 5: Best Practices Research - Progress Report

**Agent:** @web-researcher Agent 5  
**Task:** Research latest fixes for current failures  
**Status:** ✅ COMPLETED  
**Assigned:** 2026-02-09

## Research Summary

### 1. Bundle Size Check Best Practices 2024

**Key Findings:**

1. **Size-Limit Configuration**
   - Use `@size-limit/preset-app` for accurate bundle size measurement
   - Set realistic budgets based on actual bundle analysis
   - Include gzip compression in measurements
   - Use `webpack-bundle-analyzer` for detailed breakdowns

2. **GitHub Actions Best Practices**
   - Use `actions/github-script` for PR comments
   - Cache node_modules and build artifacts
   - Fail workflow when budget exceeded, but provide clear error messages
   - Consider using `continue-on-error` for informational checks

3. **Common Fixes for Bundle Size Failures**
   - Increase budget if recent features legitimately need more space
   - Implement code splitting for vendor chunks
   - Tree-shake unused dependencies
   - Use dynamic imports for heavy components

**Recommended Tools:**

- `size-limit` - Primary bundle size checker
- `webpack-bundle-analyzer` - Visual bundle analysis
- `@size-limit/preset-app` - Accurate size measurement

### 2. Lighthouse CI NO_FCP React SPA Solutions

**Key Findings:**

1. **Root Causes of NO_FCP:**
   - JavaScript errors preventing render
   - Server not serving content
   - React hydration issues
   - Headless Chrome timing issues with SPAs

2. **Recommended Solutions (in order):**

   **Option A: Add waitFor Selector**

   ```javascript
   collect: {
     settings: {
       waitFor: '#root:not(:empty)',
       maxWaitForFcp: 120000,
       pauseAfterFcpMs: 10000,
     }
   }
   ```

   **Option B: Use puppeteerScript for SPA**

   ```javascript
   collect: {
     puppeteerScript: './puppeteer-script.js',
     settings: {
       emulatedFormFactor: 'desktop',
     }
   }
   ```

   **Option C: SSR Landing Page**
   - Create static HTML landing page
   - Lighthouse tests against static page
   - Separate from main SPA entry

3. **Configuration Best Practices:**
   - Set `maxWaitForLoad` to at least 180000 (3 minutes)
   - Use `pauseAfterFcpMs` for React hydration
   - Add `--disable-background-timer-throttling` Chrome flag
   - Test locally before CI

### 3. SonarCloud GitHub Actions Integration Troubleshooting

**Key Findings:**

1. **Common Issues:**
   - Missing SONAR_TOKEN secret
   - GitHub App not installed
   - LCOV coverage report not found
   - Incorrect project configuration

2. **Required Setup:**

   ```yaml
   # GitHub Secret Required:
   SONAR_TOKEN=<token from sonarcloud.io>

   # sonar-project.properties:
   sonar.projectKey=<organization>_<repo>
   sonar.organization=<organization>
   sonar.javascript.lcov.reportPaths=coverage/lcov.info
   ```

3. **Troubleshooting Steps:**
   1. Verify SONAR_TOKEN is configured in GitHub repo settings
   2. Ensure SonarCloud GitHub App is installed
   3. Check that coverage report is generated at specified path
   4. Verify project exists on SonarCloud dashboard

4. **Fallback Options:**
   - If SonarCloud can't be configured quickly, make check optional
   - Use Codecov as alternative for coverage reporting
   - Consider removing check from required status checks

## Recommendations Summary

### For Bundle Size:

- Increase main bundle budget to 600 kB (current 500 kB may be too tight)
- Consider making the check non-blocking if budget is informational

### For Lighthouse NO_FCP:

- Add `waitFor: '#root'` to lighthouserc.cjs
- Increase `pauseAfterFcpMs` to 10000ms
- Test locally with `npm run lighthouse:ci`

### For SonarCloud:

- Requires admin access to configure SONAR_TOKEN
- May need to temporarily disable or make optional
- Coverage already being reported to Codecov as alternative

## Sources Consulted

- GitHub Actions Bundle Size Diff Action
- Lighthouse CI Configuration Documentation
- SonarCloud CI Analysis Documentation
- Community best practices for React SPA testing

**Status:** ✅ Research completed  
**Blocked On:** None
