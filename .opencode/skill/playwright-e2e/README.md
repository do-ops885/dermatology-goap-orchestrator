# Playwright E2E Test Skill

Production-ready testing for React 19 + TypeScript 5.8.

## Quick Start

```bash
# Install
npm install --save-dev @playwright/test @axe-core/playwright
npx playwright install --with-deps

# Run
npx playwright test --ui
```

## File Structure

```
.opencode/skill/playwright-e2e/
├── SKILL.md              # Quick reference
├── README.md             # This file
├── anti-patterns.md      # What NOT to do
├── templates/
│   ├── basic-test.ts
│   ├── api-mocking.ts
│   ├── accessibility.ts
│   ├── visual-regression.ts
│   └── github-actions.yml
├── examples/
│   ├── lesion-analysis.spec.ts
│   ├── fairness-audit.spec.ts
│   └── privacy-encryption.spec.ts
└── helpers/
    ├── utilities.ts
    └── setup.ts
```

## Usage

1. Read `SKILL.md` for quick reference
2. Copy `templates/basic-test.ts` as starting point
3. Use semantic selectors (getByRole, getByLabel)
4. Check `anti-patterns.md` to avoid mistakes
5. Debug failing tests with `troubleshooting.md` + `playwright-cli`

## Debugging Workflow

```bash
# 1. Tests auto-start dev server via playwright.config.ts
# No manual npm run dev needed

# 2. For manual debugging:
playwright-cli open http://localhost:5173
playwright-cli snapshot

# 3. Replicate issue, inspect DevTools
playwright-cli console
playwright-cli network

# 4. Convert CLI workflow to automated test
# See troubleshooting.md for conversion guide

# 5. Fix test using templates
# See templates/basic-test.ts
```

## Templates

| Template             | Use Case            |
| -------------------- | ------------------- |
| basic-test.ts        | Standard workflows  |
| api-mocking.ts       | API interactions    |
| accessibility.ts     | WCAG 2.1 compliance |
| visual-regression.ts | UI validation       |
