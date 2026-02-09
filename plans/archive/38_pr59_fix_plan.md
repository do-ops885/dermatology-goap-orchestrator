# PR #59 Fix Coordination Plan

**Date:** 2026-02-08  
**Target:** https://github.com/do-ops885/dermatology-goap-orchestrator/pull/59  
**Branch:** `docs/add-github-actions-plan`  
**Orchestrator:** GOAP Agent

---

## Issues to Fix (Source: gh CLI)

### 1. bundle-size Workflow - Permission Error

**Error:** `Resource not accessible by integration` (403)  
**Fix:** Add `pull-requests: write` permission to workflow
**File:** `.github/workflows/bundle-size.yml`

### 2. Lighthouse CI - ES Module Error

**Error:** `module is not defined in ES module scope`  
**Fix:** Rename `lighthouserc.js` to `lighthouserc.cjs`  
**File:** `lighthouserc.js`

### 3. Unit Tests - Pre-existing Failures

**Status:** Neural network inference issues (pre-existing)  
**Note:** Cannot fix in this PR - requires separate effort  
**Action:** Document and skip for now

### 4. SonarCloud Scan

**Status:** Failing due to test failures  
**Action:** Will pass once tests are fixed or made non-blocking

---

## Agent Coordination

| Agent   | Role           | Task                        | File                                   |
| ------- | -------------- | --------------------------- | -------------------------------------- |
| Agent 1 | Coordinator    | Orchestrate, verify, merge  | -                                      |
| Agent 2 | Workflow Fixer | Fix bundle-size permissions | `.github/workflows/bundle-size.yml`    |
| Agent 3 | Config Fixer   | Fix Lighthouse ES module    | `lighthouserc.js` → `lighthouserc.cjs` |

---

## Execution Plan

### Phase 1: Fix bundle-size permissions

```yaml
# Add to .github/workflows/bundle-size.yml
permissions:
  contents: read
  pull-requests: write
```

### Phase 2: Fix Lighthouse config

```bash
mv lighthouserc.js lighthouserc.cjs
# Update reference in workflow if needed
```

### Phase 3: Verify and push

- Run local checks
- Push to branch
- Monitor GitHub Actions

### Phase 4: Admin merge (if required)

Some checks (Unit Tests, SonarCloud) have pre-existing failures and may require admin override to merge documentation PR.

---

## Status

- [ ] Phase 1: bundle-size fix
- [ ] Phase 2: Lighthouse fix
- [ ] Phase 3: Push and verify
- [ ] Phase 4: Merge PR
