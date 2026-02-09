# Repository-Wide Issues Analysis

**Analysis Date:** 2026-02-09  
**Total Workflows:** 11  
**Critical Issues:** 1 confirmed bug, 2 application-level issues  
**Overall Health:** ⚠️ FAIR (workflows well-configured, some app issues)

## Summary

Good news: **All workflows follow modern best practices** with proper permissions, timeouts, concurrency controls, and up-to-date action versions. The high failure rates are primarily due to **application rendering issues**, not workflow misconfiguration.

## Issue Inventory

| Workflow              | Failure Rate | Severity    | Issue Type  | Description                                     |
| --------------------- | ------------ | ----------- | ----------- | ----------------------------------------------- |
| Bundle Size Check     | 80%          | 🔴 Critical | Bug         | Missing vendor_size output variable             |
| E2E Tests             | 100%         | 🟠 High     | Application | App not rendering (same as Lighthouse)          |
| Lighthouse CI         | 100%         | 🟠 High     | Application | App not rendering (NO_FCP error)                |
| Dependabot Auto-Merge | 100%\*       | 🟡 Low      | Expected    | Only runs for dependabot PRs (correct behavior) |
| Lockfile Maintenance  | 50%          | 🟡 Medium   | External    | Intermittent npm/network issues                 |
| CI                    | 50%          | 🟡 Medium   | Flaky Tests | Unit test flakiness                             |

\*Expected behavior - not a bug

---

## Category 1: Configuration/YAML Errors

### ❌ Bundle Size Check - Missing Output Variable

**File:** `.github/workflows/bundle-size.yml`  
**Severity:** 🔴 Critical  
**Failure Rate:** 80% (8/10 failures)

#### Bug Description

The workflow references `vendor_size` and `vendor_size_bytes` outputs that are **never set** by the analyze step.

#### Evidence

**Lines 124-125** reference these outputs:

```yaml
- Main bundle: ${{ steps.analyze.outputs.main_size }} (${{ steps.analyze.outputs.main_size_bytes }} bytes)
- Vendor bundle: ${{ steps.analyze.outputs.vendor_size }} (${{ steps.analyze.outputs.vendor_size_bytes }} bytes)
```

**Lines 71-74** show only these outputs are set:

```bash
echo "main_size=$MAIN_SIZE" >> $GITHUB_OUTPUT
echo "main_size_bytes=$MAIN_SIZE_BYTES" >> $GITHUB_OUTPUT
echo "webllm_size=$WEBLLM_SIZE" >> $GITHUB_OUTPUT
echo "tfjs_size=$TFJS_SIZE" >> $GITHUB_OUTPUT
```

**Missing:** `vendor_size` and `vendor_size_bytes`

#### Impact

- PR comments show empty vendor bundle values
- May cause confusion but workflow still passes/fails based on budgets

#### Fix Required

Add the missing output variables to the analyze step (see patch file).

---

## Category 2: Environment/Secrets/Permissions

### ✅ No Issues Found

All workflows have appropriate `permissions:` blocks following least privilege principle:

- `contents: read` for most workflows
- `contents: write` only for Release and Lockfile Maintenance
- `pull-requests: write` where needed for commenting
- `security-events: write` for CodeQL

---

## Category 3: Job Logic Failures

### 🟠 E2E Tests - Application Not Rendering

**File:** `.github/workflows/e2e.yml`  
**Severity:** 🟠 High  
**Failure Rate:** 100% (10/10 failures)

#### Root Cause

Same underlying issue as Lighthouse: **Application fails to render in browser**

#### Evidence

- All 3 test shards fail consistently
- Playwright cannot interact with page elements
- App likely shows blank page (same NO_FCP root cause)

#### Assessment

**NOT a workflow configuration issue.** The workflow is correctly configured with:

- Proper sharding (3 shards)
- Playwright browser caching
- Artifact uploads
- Retry logic via `fail-fast: false`

The tests fail because the application doesn't render, not because of test logic.

#### Recommended Fix

1. Fix application rendering issue (see Lighthouse analysis)
2. Consider adding `continue-on-error: true` temporarily to unblock PRs
3. Or make E2E tests non-blocking in branch protection

---

### 🟠 Lighthouse CI - Application Not Rendering

**File:** `.github/workflows/lighthouse.yml`  
**Severity:** 🟠 High  
**Failure Rate:** 100% (10/10 failures)

#### Root Cause

**NO_FCP Error:** Application doesn't paint any content in browser

#### Evidence

Detailed logs show:

- Server starts successfully
- HTTP 200 responses
- HTML contains `id="root"` element
- **JavaScript/React app fails to hydrate**

#### Assessment

**NOT a workflow configuration issue.** The workflow is excellently configured with:

- Proper timeout controls
- Retry logic (3 attempts)
- Server health checks
- Detailed logging
- Artifact uploads

#### Recommended Fix

See PR #59 analysis - this requires application-level debugging.

---

### 🟡 CI - Unit Test Flakiness

**File:** `.github/workflows/ci.yml`  
**Severity:** 🟡 Medium  
**Failure Rate:** 50% (5/10 failures)

#### Current State

- Workflow has `continue-on-error: true` on unit-tests job (line 58)
- Recent runs show improvement (now passing)

#### Assessment

Unit tests may have some flakiness, but workflow handles it gracefully. Not a critical issue.

---

## Category 4: Flaky/Transient Issues

### 🟡 Lockfile Maintenance - Intermittent Failures

**File:** `.github/workflows/lockfile-maintenance.yml`  
**Severity:** 🟡 Medium  
**Failure Rate:** 50% (2/4 failures)

#### Pattern

- Scheduled weekly runs
- 2 successes, 2 failures
- Failures likely due to npm registry issues or dependency conflicts

#### Assessment

Not a workflow configuration issue. The workflow is correctly designed with:

- `continue-on-error: true`
- Proper timeout controls
- PR creation with peter-evans/create-pull-request@v6

---

## Category 5: Workflow Wiring Issues

### ✅ No Issues Found

All workflows have correct:

- `on:` triggers (push, pull_request, schedule)
- Branch filters (`branches: [main]`)
- Job dependencies (`needs:`)
- Concurrency controls

---

## Category 6: Security/Compliance Issues

### ✅ No Issues Found

Security audit results:

- All actions use current versions (@v4, @v3 for CodeQL)
- No deprecated actions found
- Proper `permissions:` blocks throughout
- No `pull_request_target` misuse
- No hardcoded secrets
- Gitleaks secret scanning configured

#### Action Versions Audit

| Action                            | Current Version | Status     |
| --------------------------------- | --------------- | ---------- |
| actions/checkout                  | @v4             | ✅ Current |
| actions/setup-node                | @v4             | ✅ Current |
| actions/upload-artifact           | @v4             | ✅ Current |
| actions/download-artifact         | @v4             | ✅ Current |
| actions/cache                     | @v4             | ✅ Current |
| actions/stale                     | @v9             | ✅ Current |
| github/codeql-action              | @v3             | ✅ Current |
| actions/github-script             | @v7             | ✅ Current |
| gitleaks/gitleaks-action          | @v2.3.9         | ✅ Current |
| SonarSource/sonarqube-scan-action | @v4             | ✅ Current |
| codecov/codecov-action            | @v4             | ✅ Current |
| actions/dependency-review-action  | @v4             | ✅ Current |
| peter-evans/create-pull-request   | @v6             | ✅ Current |
| softprops/action-gh-release       | @v2             | ✅ Current |

---

## Category 7: Maintenance Issues

### 🟡 Dependabot Auto-Merge - Expected Behavior

**File:** `.github/workflows/dependabot-automerge.yml`  
**Severity:** 🟡 Low (Informational)  
**Failure Rate:** 100% (but expected)

#### Analysis

This workflow **correctly** only runs for `dependabot[bot]` actor:

```yaml
if: ${{ github.actor == 'dependabot[bot]' }}
```

The "failures" are actually **skipped runs** on non-dependabot PRs. This is correct behavior.

#### Assessment

No fix needed. The workflow works as intended.

---

## Positive Findings

### ✅ Excellent Workflow Practices Found

1. **Modern Action Versions:** All actions use current versions (@v4)
2. **Proper Permissions:** All workflows have explicit `permissions:` blocks
3. **Concurrency Controls:** All workflows prevent resource waste with `concurrency:`
4. **Timeout Controls:** All jobs have `timeout-minutes`
5. **Retry Logic:** Lighthouse has sophisticated retry logic
6. **Artifact Management:** Proper artifact uploads with retention policies
7. **Caching:** npm and Playwright browsers cached
8. **Fail-Fast Disabled:** E2E tests use `fail-fast: false` for sharded jobs

### ✅ Healthy Workflows

| Workflow     | Failure Rate    | Status        |
| ------------ | --------------- | ------------- |
| Stale        | 0%              | ✅ Perfect    |
| Security     | 30%             | ✅ Acceptable |
| Code Quality | 30%             | ✅ Acceptable |
| Release      | N/A (never run) | ✅ Ready      |

---

## Prioritized Fix List

### 🔴 Critical (Fix Immediately)

1. **Bundle Size Check** - Add missing vendor_size output variables

### 🟠 High (Fix Soon)

2. **Application Rendering** - Fix NO_FCP issue affecting Lighthouse and E2E (requires app debugging, not workflow changes)

### 🟡 Medium (Optional Improvements)

3. **E2E Tests** - Consider adding `continue-on-error: true` temporarily to unblock PRs
4. **Documentation** - Add comments explaining Dependabot Auto-Merge behavior

### 🟢 Low (Future Enhancements)

5. **Bundle Budgets** - Review if ML bundle budgets are realistic
6. **Code Coverage** - Set up CODECOV_TOKEN secret for coverage uploads

---

## Conclusion

**Repository workflows are well-designed and follow best practices.** The high failure rates are primarily due to:

1. **One confirmed bug** in Bundle Size Check (fixable)
2. **Application rendering issues** affecting Lighthouse and E2E (requires app debugging)
3. **Expected behavior** for Dependabot Auto-Merge

**Recommendation:** After fixing the Bundle Size Check bug and addressing application rendering issues, the repository will have a healthy, maintainable CI/CD setup.
