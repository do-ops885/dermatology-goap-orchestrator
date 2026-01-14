---
description: Run tests, check coverage, and debug test failures
agent: build
---

Run the test suite and analyze results.

Tasks:

1. Execute unit tests: `npm run test`
2. Check coverage report and identify areas below 80%
3. Execute E2E tests: `npx playwright test`
4. Report any failures and suggest fixes

Focus on:

- Safety Interception scenarios (low-confidence path routing)
- Any tests below 80% coverage threshold
- Flaky or inconsistent test results

Provide:

- Summary of test results
- Coverage gaps that need attention
- Recommended fixes for failing tests
- Any missing E2E scenarios for the clinical pipeline

$ARGUMENTS
