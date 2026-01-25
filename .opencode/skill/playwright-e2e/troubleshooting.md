# Playwright Troubleshooting Guide

Debug failing E2E tests using interactive CLI tools.

## Quick Decision Tree

```
Test failing?
  ├─ Flaky test? → Add auto-wait, check network states
  ├─ Selector not found? → Use playwright-cli to inspect
  ├─ API timeout? → Mock responses (see api-mocking.ts)
  └─ Unknown error? → Use playwright-cli + tracing
```

## Debug Workflow

### 1. Running Tests

Playwright automatically starts the dev server via `playwright.config.ts`:

```bash
# Starts server + runs tests
npx playwright test

# Interactive mode
npx playwright test --ui

# Debug specific test
npx playwright test --debug
```

### 2. Manual Debugging with CLI

For interactive browser debugging, start manually:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Launch playwright-cli
playwright-cli open http://localhost:5173
```

### 3. Inspect Failed Test Scenario

```bash
# Launch interactive browser
playwright-cli open http://localhost:5173

# See page structure
playwright-cli snapshot

# Navigate to failing page
playwright-cli click e15
playwright-cli fill e5 "test data"
playwright-cli click e20
```

### 3. Check Selectors

```bash
# Get element attributes
playwright-cli eval "el => el.getAttribute('aria-label')" e5

# Check if element is visible
playwright-cli eval "el => el.offsetParent !== null" e7

# Verify element text
playwright-cli eval "el => el.textContent" e5
```

### 4. Use DevTools

```bash
# Monitor console errors
playwright-cli console

# Check network requests
playwright-cli network

# Run code in browser context
playwright-cli run-code "console.log('Debug:', window.location.href)"
```

### 5. Capture Traces

```bash
playwright-cli open http://localhost:5173
playwright-cli tracing-start

# Reproduce issue
playwright-cli fill e5 "test"
playwright-cli click e7

playwright-cli tracing-stop
# View trace in Playwright Inspector
```

## Common Issues & Solutions

### Issue: Selector Timeout

**Problem**: `Timeout: waiting for selector`  
**Cause**: Element not loaded, wrong selector, dynamic rendering

**Fix**:

```bash
# Check if element exists
playwright-cli snapshot

# Verify selector is correct
playwright-cli eval "document.querySelector('[aria-label=\"Email\"]')"

# Check if element is visible
playwright-cli eval "document.querySelector('[aria-label=\"Email\"]').offsetParent"
```

### Issue: Unexpected Dialog

**Problem**: Test stops at confirm/alert dialog  
**Cause**: Unhandled JavaScript dialog

**Fix with CLI**:

```bash
playwright-cli click e7
playwright-cli dialog-accept
```

**Fix in Test**:

```typescript
page.on('dialog', (dialog) => dialog.accept());
```

### Issue: Network Timeout

**Problem**: API call never completes  
**Cause**: Slow server, error response

**Fix**:

```bash
# Check network
playwright-cli network

# Mock API response (in test)
await page.route('**/api/endpoint', async route => {
  await route.fulfill({
    status: 200,
    body: JSON.stringify({ data: 'mocked' })
  });
});
```

### Issue: Element Covered/Disabled

**Problem**: Element click intercepted or disabled  
**Cause**: Overlay, loading state, disabled attribute

**Fix**:

```bash
# Check element state
playwright-cli eval "el => el.disabled" e7
playwright-cli eval "el => el.getBoundingClientRect()" e7

# Wait for overlay to disappear
playwright-cli run-code "await new Promise(r => setTimeout(r, 2000))"
playwright-cli snapshot
playwright-cli click e7
```

## Converting Debug Session to Test

After successfully replicating workflow with CLI:

### Step 1: Note the Actions

```bash
# Your CLI session:
playwright-cli open http://localhost:5173
playwright-cli fill e5 "user@example.com"
playwright-cli click e7
playwright-cli snapshot
```

### Step 2: Map Refs to Selectors

```bash
# Check element attributes
playwright-cli eval "el => el.outerHTML" e5
# Output: <input aria-label="Email" type="email" ... />

# Map: e5 → page.getByLabel('Email')
```

### Step 3: Create Test File

```typescript
import { test, expect } from '@playwright/test';

test('should submit form', async ({ page }) => {
  await page.goto('/');

  // From CLI: fill e5
  await page.getByLabel('Email').fill('user@example.com');

  // From CLI: click e7
  await page.getByRole('button', { name: /submit/i }).click();

  await expect(page.getByText('Success')).toBeVisible();
});
```

### Step 4: Run Test

```bash
npx playwright test --ui
```

## Advanced Debugging

### Mobile Viewport

```bash
playwright-cli resize 375 667
playwright-cli snapshot
# Test mobile-specific bugs
```

### Slow Mo

```bash
playwright-cli --slow-mo=500 open http://localhost:5173
# Watch each step in slow motion
```

### Persistent Session

```bash
# Start session
playwright-cli --session=debug open http://localhost:5173

# Continue session in another terminal
playwright-cli --session=debug click e5
playwright-cli --session=debug fill e7 "test"

# List all sessions
playwright-cli session-list
```

## Quick Reference Commands

| Task             | CLI Command                    | How It Helps          |
| ---------------- | ------------------------------ | --------------------- |
| See page         | `snapshot`                     | Find element refs     |
| Get attribute    | `eval "el => el.attr"`         | Verify selectors      |
| Check visibility | `eval "el => el.offsetParent"` | Debug hidden elements |
| Monitor errors   | `console`                      | See JS errors         |
| Network monitor  | `network`                      | Check API calls       |
| State inspection | `run-code "window.__STATE__"`  | Debug app state       |

## Related Skills

- **playwright-cli**: Full command reference for debugging
- **playwright-e2e**: Test templates and patterns
- **templates/api-mocking.ts**: Mock API responses for reliable tests

(version: January 2026)
