---
name: playwright-e2e-test-generation
description: Generate Playwright E2E tests for user-facing workflows. Use when asked to write browser tests, test user interactions, or create integration tests for web applications.
metadata:
  version: "1.0.0"
  dependencies:
    - playwright-cli
---

# Playwright E2E Test Generation Skill

## Decision Tree: Should I Write This Test?

User-facing workflow? ────NO──→ Unit test (Vitest)
│
YES → Business-critical? ────NO──→ Consider skipping
│
YES → Write E2E test

## Selector Priority

1. **Role-based**: `getByRole('button', { name: /upload/i })`
2. **Label text**: `getByLabel('Patient ID')`
3. **Placeholder**: `getByPlaceholder('Enter email')`
4. **Test IDs**: `getByTestId('result-card')` (dynamic content only)

❌ **Never use**: CSS hashes, dynamic IDs, XPath, nth-child

## Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should [action] when [condition]', async ({ page }) => {
    await page.getByLabel('Upload Image').setInputFiles('fixtures/test.jpg');
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

## Critical Rules

### ✅ DO

- Test user-visible outcomes
- Use auto-waiting
- Isolate tests
- Mock external APIs
- Keep under 500 LOC

### ❌ DON'T

- Test implementation details
- Use hard waits
- Create dependencies
- Use brittle selectors

## Quick Checklist

- [ ] Test name describes user behavior
- [ ] Uses semantic selectors
- [ ] No hard waits
- [ ] Test is isolated
- [ ] APIs are mocked
- [ ] < 500 LOC

---

## Debugging Failed Tests with playwright-cli

When automated tests fail, use interactive debugging:

```bash
# 1. Start dev server
npm run dev

# 2. Debug interactively
playwright-cli open http://localhost:5173
playwright-cli snapshot

# 3. Replicate test steps manually
playwright-cli click e5
playwright-cli fill e7 "test@domain.com"
playwright-cli screenshot

# 4. Inspect DevTools
playwright-cli console
playwright-cli network

# 5. Check element refs match test selectors
playwright-cli eval "el => el.getAttribute('aria-label')" e7
```

**Converting CLI Workflow → Automated Test**

After debugging with CLI, create test using semantic selectors:

```typescript
// CLI: playwright-cli click e5 → Test: page.getByRole('button', { name: /submit/i })
// CLI: playwright-cli fill e7 "email" → Test: page.getByLabel('Email').fill('email')
```

## playwright.config.ts Integration

- **webServer**: Auto-starts dev server (`npm run dev`) before tests
- **baseURL**: Use relative paths (`page.goto('/')` instead of full URLs)
- **reuseExistingServer**: Dev server persists locally for faster debug cycles

`npx playwright test` automatically manages server lifecycle.

**Cross-Reference**: See `playwright-cli` skill for full command reference
