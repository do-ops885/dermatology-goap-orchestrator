# GitHub Actions Dependency Resolution Fix Plan

**Date:** 2026-01-14
**Status:** 🚨 Critical - All workflows failing (NEEDS IMMEDIATE ATTENTION)
**Related Workflows:** CI, Lint, Security, Code Quality, E2E Tests
**Impact:** Complete CI/CD pipeline breakdown blocking all deployments

---

## Executive Summary

All GitHub Actions workflows are failing due to **peer dependency conflicts**. The primary blocker is `pretty-quick@3.1.3` which requires `prettier@^2.0.0`, but the project uses `prettier@^3.0.0`. This causes `npm ci` to fail across all workflows.

---

## Issues Identified

### 1. CRITICAL: `pretty-quick` Peer Dependency Conflict 🔴

```
npm error While resolving: pretty-quick@3.1.3
npm error Found: prettier@3.7.4
npm error   dev prettier@"^3.0.0" from the root project
npm error
npm error Could not resolve dependency:
npm error peer prettier@"^2.0.0" from pretty-quick@3.1.3
npm error
npm error Conflicting peer dependency: prettier@2.8.8
```

**Impact:**

- ❌ CI workflow - FAILED
- ❌ Lint workflow - FAILED
- ❌ Security workflow - FAILED
- ❌ Code Quality workflow - FAILED
- ❌ All Dependabot PRs - FAILED

**Root Cause:** `pretty-quick@3.1.3` has an outdated peer dependency constraint that doesn't support Prettier v3.

---

### 2. WARNING: Vitest Peer Dependency Conflict 🟡

```
npm warn While resolving: @vitest/mocker@2.1.9
npm warn Found: vite@6.4.1
npm warn node_modules/vite
npm warn   dev vite@"^6.2.0" from the root project
npm warn
npm warn Could not resolve dependency:
npm warn peerOptional vite@"^5.0.0" from @vitest/mocker@2.1.9
```

**Impact:** Currently non-blocking warning, but should be addressed for long-term stability.

---

## Solution Strategy

### Option A: Replace `pretty-quick` with `lint-staged` (Recommended) ✅

**Pros:**

- ✅ Modern, actively maintained
- ✅ No Prettier version constraints
- ✅ More flexible configuration
- ✅ Better performance
- ✅ Already in devDependencies

**Cons:**

- ⚠️ Requires updating `.husky/pre-commit` hook
- ⚠️ Requires removing `pretty-quick` from package.json

**Changes Required:**

1. Remove `pretty-quick` from `devDependencies`
2. Update `.husky/pre-commit` to use `lint-staged` directly
3. Update `package.json` scripts if needed

---

### Option B: Downgrade to Prettier v2 (Not Recommended) ❌

**Cons:**

- ❌ Losing Prettier v3 improvements
- ❌ May conflict with other tools expecting v3
- ❌ Short-term fix with long-term problems

---

### Option C: Use `--legacy-peer-deps` (Not Recommended) ❌

**Cons:**

- ❌ Ignores real dependency conflicts
- ❌ May cause runtime issues
- ❌ Not a proper fix

---

## Implementation Plan (Option A)

### Step 1: Update `package.json`

```json
{
  "devDependencies": {
    // Remove this line:
    // "pretty-quick": "^3.1.3",

    // Keep lint-staged (already present)
    "lint-staged": "^14.0.0"
  },

  "scripts": {
    // Update prepare script to use lint-staged directly
    "prepare": "husky install"
  }
}
```

### Step 2: Update `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

# Run lint-staged directly instead of pretty-quick
npx lint-staged
```

### Step 3: Keep `lint-staged` Configuration (Already in package.json)

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": "prettier --write"
  }
}
```

### Step 4: Address Vitest Warning (Optional but Recommended)

Update vitest to v4.x which supports Vite v6:

```json
{
  "devDependencies": {
    "@vitest/coverage-v8": "^4.0.0",
    "vitest": "^4.0.0"
  }
}
```

---

## Prevention Measures

### 1. Add Pre-Commit Dependency Check

Create `scripts/check-dependencies.sh`:

```bash
#!/usr/bin/env bash
# Check for peer dependency conflicts before commit

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "Checking for dependency resolution issues..."

# Try to simulate npm ci without actually installing
if ! npm install --dry-run --legacy-peer-deps 2>&1 | grep -q "ERESOLVE"; then
  echo -e "${GREEN}✓ No peer dependency conflicts detected${NC}"
  exit 0
fi

echo -e "${RED}✗ Dependency conflicts detected. Run 'npm install' to see details.${NC}"
exit 1
```

### 2. Update `.husky/pre-commit` to Include Dependency Check

```bash
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

echo "Running pre-commit quality gate..."

# Run dependency check first
if [ -f "./scripts/check-dependencies.sh" ]; then
  sh ./scripts/check-dependencies.sh || exit $?
fi

# Run lint-staged for formatting
npx lint-staged

# Optional: Run fast quality gate
# npx --no-install --no bash scripts/quality-gate.sh --fast --fix || exit $?

echo "Pre-commit checks passed ✅"
```

### 3. Update GitHub Actions Workflows

#### Workflow Enhancement 1: Add Dependency Check Job

Add to `.github/workflows/ci.yml`:

```yaml
jobs:
  dependency-check:
    name: Dependency Resolution Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Use Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Verify dependency resolution
        run: |
          npm install --dry-run
          echo "✓ Dependencies can be resolved successfully"
```

#### Workflow Enhancement 2: Use `--legacy-peer-deps` Fallback

Update all workflows to handle peer dependencies gracefully:

```yaml
- name: Install dependencies
  run: |
    npm ci || npm ci --legacy-peer-deps
```

---

## Testing Checklist

- [ ] **CRITICAL:** Update `package.json` - remove `pretty-quick` dependency
- [ ] **CRITICAL:** Update `.husky/pre-commit` hook to use `lint-staged` directly
- [ ] Verify `lint-staged` configuration works locally
- [ ] Run `npm install` to verify no conflicts
- [ ] Run `npm run lint:fix` to test formatting
- [ ] Run `npm ci` to verify clean install
- [ ] **CRITICAL:** Update GitHub Actions workflows with dependency resolution fixes
- [ ] Test workflows locally (using `act` if available)
- [ ] Push to feature branch and verify CI passes
- [ ] Address Vitest warning (optional but recommended)

**URGENT:** This issue blocks all PR merges and deployments. Priority: P0

---

## Rollback Plan

If issues arise after deployment:

1. Revert `package.json` changes
2. Restore `.husky/pre-commit` to use `pretty-quick`
3. Use `--legacy-peer-deps` in workflows as temporary fix
4. Document rollback reason

---

## Related Documentation

- [AGENTS.md](./AGENTS.md) - Code quality standards
- [03_devops_workflow.md](./03_devops_workflow.md) - DevOps workflow strategies
- [11_react_19_modernization.md](./11_react_19_modernization.md) - React 19 migration
- [13_code_organization_refactor.md](./13_code_organization_refactor.md) - Code organization guidelines

---

## Dependencies

**Current State:**

- `prettier@^3.0.0` (latest: 3.7.4)
- `pretty-quick@^3.1.3` (outdated peer deps)
- `lint-staged@^14.0.0` (already available, modern)
- `vitest@^2.1.9` (wants vite@^5.0.0)

**Proposed State:**

- `prettier@^3.0.0` (no change)
- `pretty-quick` (removed)
- `lint-staged@^14.0.0` (no change, used directly)
- `vitest@^4.0.0` (optional upgrade)

---

## Success Criteria

- ✅ All GitHub Actions workflows pass
- ✅ No peer dependency warnings during `npm ci`
- ✅ Pre-commit hook runs `lint-staged` successfully
- ✅ Code formatting works as expected
- ✅ Dependabot PRs pass CI checks
- ✅ No regressions in local development workflow

---

## Estimated Time

- Implementation: 30 minutes
- Testing: 30 minutes
- Total: 1 hour

---

## Owner

DevOps Lead (as per `plans/03_devops_workflow.md`)
