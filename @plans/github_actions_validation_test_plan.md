# GitHub Actions Validation Plan

**Prepared by:** Testing Agent  
**Date:** 2026-01-14  
**Status:** Preparation Phase (Tests not yet executed)

---

## 1. Executive Summary

This plan validates fixes for GitHub Actions failures related to:

- Missing package-lock.json in workflows
- npm ci compatibility issues
- Dependabot auto-merge functionality
- Lockfile maintenance workflow

---

## 2. Test Scope

### 2.1 Workflows Under Test

| Workflow File                                 | Purpose                              | Priority |
| :-------------------------------------------- | :----------------------------------- | :------- |
| `.github/workflows/ci.yml`                    | Main CI pipeline (lint, test, build) | CRITICAL |
| `.github/workflows/auto-merge-dependabot.yml` | Dependabot PR automation             | CRITICAL |
| `.github/workflows/lockfile-maintenance.yml`  | Weekly lockfile updates              | HIGH     |
| `.github/workflows/lint.yml`                  | Lint-only workflow                   | MEDIUM   |
| `.github/workflows/e2e.yml`                   | E2E test workflow                    | MEDIUM   |

### 2.2 Key Issues to Validate

1. **package-lock.json Validation**
   - [ ] Verify lockfile exists in repository
   - [ ] Ensure lockfile is JSON-parseable
   - [ ] Validate lockfile matches package.json
   - [ ] Check lockfile integrity (SHA-256 hashes)

2. **npm ci Compatibility**
   - [ ] npm ci succeeds in clean environment
   - [ ] npm ci --legacy-peer-deps fallback works
   - [ ] Node cache configuration is correct
   - [ ] Install steps complete within timeout

3. **Dependabot Integration**
   - [ ] Dependabot bot actor detection
   - [ ] CI check monitoring works
   - [ ] Auto-merge triggers correctly
   - [ ] Permission scopes are adequate

4. **Lockfile Maintenance**
   - [ ] npm update completes successfully
   - [ ] PR creation works
   - [ ] Labels and branch naming correct
   - [ ] Scheduled runs work

---

## 3. Test Cases

### 3.1 Core Functionality Tests

#### TC001: Lockfile Existence and Validity

**Description:** Verify package-lock.json exists and is valid JSON

**Steps:**

1. Run `scripts/validate-lockfile.sh`
2. Check exit code is 0
3. Verify all checks pass

**Expected Result:** Lockfile exists, valid JSON, matches package.json

**Priority:** CRITICAL

---

#### TC002: npm ci Success

**Description:** Ensure npm ci succeeds in clean environment

**Steps:**

1. Remove node_modules: `rm -rf node_modules`
2. Run `npm ci`
3. Verify no errors

**Expected Result:** npm ci completes successfully

**Priority:** CRITICAL

---

#### TC003: npm ci Fallback

**Description:** Test legacy peer deps fallback

**Steps:**

1. Remove node_modules: `rm -rf node_modules`
2. Run `npm ci --legacy-peer-deps`
3. Verify completion

**Expected Result:** Installation completes with fallback flag

**Priority:** CRITICAL

---

#### TC004: CI Workflow Syntax

**Description:** Validate workflow YAML syntax

**Steps:**

1. Run `scripts/validate-workflows.sh`
2. Check all workflows parse correctly

**Expected Result:** No YAML syntax errors in any workflow

**Priority:** HIGH

---

#### TC005: Node Cache Configuration

**Description:** Verify npm cache works in workflows

**Steps:**

1. Check cache: 'npm' is set in all workflows
2. Verify node-version: '20' is consistent
3. Run `npm ci` twice, measure cache hit

**Expected Result:** Cache key correct, second run faster

**Priority:** HIGH

---

### 3.2 Dependabot Integration Tests

#### TC006: Dependabot Actor Detection

**Description:** Verify workflow only triggers for Dependabot

**Steps:**

1. Set GITHUB_ACTOR to 'dependabot[bot]'
2. Run workflow logic locally
3. Verify condition passes

**Expected Result:** Condition `github.actor == 'dependabot[bot]'` evaluates correctly

**Priority:** CRITICAL

---

#### TC007: CI Check Wait

**Description:** Test CI check monitoring

**Steps:**

1. Simulate pending CI check
2. Run wait-on-check-action logic
3. Verify timeout and interval settings

**Expected Result:** Workflow waits up to 3600s, checks every 60s

**Priority:** HIGH

---

#### TC008: Auto-Merge Permissions

**Description:** Verify required permissions

**Steps:**

1. Check workflow permissions section
2. Verify pull-requests: write
3. Verify contents: write

**Expected Result:** All required permissions present

**Priority:** CRITICAL

---

### 3.3 Lockfile Maintenance Tests

#### TC009: Lockfile Update Command

**Description:** Test npm update completes

**Steps:**

1. Run `npm update`
2. Verify package-lock.json changes
3. Check no ERESOLVE errors

**Expected Result:** Lockfile updates successfully

**Priority:** HIGH

---

#### TC010: PR Creation Configuration

**Description:** Verify PR creation settings

**Steps:**

1. Check branch name: chore/lockfile-update
2. Verify labels: dependencies, automerge
3. Check commit message format

**Expected Result:** All PR settings correct

**Priority:** MEDIUM

---

### 3.4 Edge Case Tests

#### TC011: No Lockfile Scenario

**Description:** Test behavior when lockfile is missing

**Steps:**

1. Temporarily move package-lock.json
2. Run `npm ci`
3. Verify error handling

**Expected Result:** Clear error message, workflow fails appropriately

**Priority:** HIGH

---

#### TC012: Corrupted Lockfile Scenario

**Description:** Test behavior with invalid lockfile JSON

**Steps:**

1. Add invalid JSON to package-lock.json
2. Run validation script
3. Verify detection

**Expected Result:** Corrupted lockfile detected, graceful failure

**Priority:** HIGH

---

#### TC013: Fork PR Scenario

**Description:** Test workflow behavior with fork PRs

**Steps:**

1. Set GITHUB_REPOSITORY to forked repo
2. Run workflow logic
3. Verify security implications

**Expected Result:** Fork checks work correctly, no auto-merge

**Priority:** MEDIUM

---

#### TC014: Large Lockfile Performance

**Description:** Test performance with large lockfile

**Steps:**

1. Measure npm ci time
2. Compare with cache-enabled run
3. Verify within acceptable limits (<5min)

**Expected Result:** Performance acceptable

**Priority:** LOW

---

#### TC015: Concurrent Job Execution

**Description:** Test multiple workflows running simultaneously

**Steps:**

1. Trigger multiple workflows
2. Monitor resource usage
3. Verify no conflicts

**Expected Result:** Jobs run independently

**Priority:** LOW

---

### 3.5 Integration Tests

#### TC016: Full CI Pipeline

**Description:** Run complete CI workflow

**Steps:**

1. Trigger CI workflow
2. Monitor all jobs (lint, unit-tests, build, secret_scan)
3. Verify all pass

**Expected Result:** All jobs complete successfully

**Priority:** CRITICAL

---

#### TC017: Dependabot Full Flow

**Description:** Simulate complete Dependabot workflow

**Steps:**

1. Create test PR from Dependabot
2. Run CI checks
3. Wait for completion
4. Trigger auto-merge

**Expected Result:** Dependabot PR merges automatically after CI passes

**Priority:** CRITICAL

---

#### TC018: Lockfile Maintenance Full Flow

**Description:** Run complete lockfile maintenance

**Steps:**

1. Trigger lockfile maintenance
2. Run npm update
3. Create PR
4. Verify PR contents

**Expected Result:** PR created with updated lockfile

**Priority:** HIGH

---

## 4. Validation Scripts

### 4.1 Lockfile Validation Script

**Location:** `scripts/validate-lockfile.sh`

**Purpose:** Verify package-lock.json exists and is valid

**Usage:** `./scripts/validate-lockfile.sh`

**Checks:**

- File existence
- JSON parseability
- Sync with package.json
- Integrity verification

---

### 4.2 Workflow Validation Script

**Location:** `scripts/validate-workflows.sh`

**Purpose:** Validate GitHub Actions workflow syntax

**Usage:** `./scripts/validate-workflows.sh`

**Checks:**

- YAML syntax
- Required keys present
- Action version validity
- Permission completeness

---

### 4.3 npm ci Test Script

**Location:** `scripts/test-npm-ci.sh`

**Purpose:** Test npm ci in various scenarios

**Usage:** `./scripts/test-npm-ci.sh [scenario]`

**Scenarios:**

- clean - Fresh install
- cached - Test cache behavior
- legacy - Test --legacy-peer-deps

---

## 5. Local Testing Strategy

### 5.1 Simulating Dependabot PRs Locally

**Method 1: Environment Variable Simulation**

```bash
export GITHUB_ACTOR='dependabot[bot]'
export GITHUB_EVENT_NAME='pull_request'
export GITHUB_REF='refs/heads/dependabot/npm_and_yarn/test-package-1.2.3'
```

**Method 2: act CLI Tool**

```bash
# Install act
brew install act  # macOS
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash  # Linux

# Run workflow locally
act push -W .github/workflows/ci.yml
```

**Method 3: Manual PR Simulation**

1. Create branch: `dependabot/npm_and_yarn/test-package-1.2.3`
2. Modify package.json and package-lock.json
3. Create PR manually
4. Trigger workflow

---

### 5.2 Testing Workflow Triggers

**Push Event:**

```bash
git add .
git commit -m "test: trigger CI"
git push origin test-branch
```

**Pull Request Event:**

```bash
gh pr create --title "Test PR" --body "Testing workflow"
```

**Workflow Dispatch:**

```bash
gh workflow run lockfile-maintenance.yml
```

---

## 6. Success Criteria

### 6.1 Critical Pass Criteria

1. **All workflows execute without syntax errors**
   - Zero YAML parse errors
   - All required keys present

2. **npm ci succeeds in all job steps**
   - Exit code 0 in all install steps
   - No ERESOLVE errors
   - Cache hits improve performance

3. **Dependabot auto-merge works end-to-end**
   - Dependabot PRs detected correctly
   - CI checks monitored
   - Merge triggers after success

4. **Lockfile maintenance creates valid PRs**
   - npm update completes
   - PR created with correct metadata
   - Labels applied correctly

### 6.2 Error Message Elimination

**Errors that must NOT appear:**

- `package-lock.json not found`
- `npm ERR! cipm can only install packages when your package.json and package-lock.json are in sync`
- `ERESOLVE unable to resolve dependency tree`
- `The workflow is not valid`
- `Resource not accessible by integration`

**Expected new behavior:**

- Clear error messages if lockfile is missing
- Graceful fallback to --legacy-peer-deps
- Informative workflow status

### 6.3 Performance Criteria

| Metric              | Target  | Measurement           |
| :------------------ | :------ | :-------------------- |
| npm ci (cold)       | <5 min  | First run time        |
| npm ci (cached)     | <1 min  | Second run time       |
| Workflow completion | <10 min | Full CI pipeline      |
| Dependabot merge    | <15 min | From PR open to merge |

### 6.4 Coverage Criteria

- [ ] All workflows tested
- [ ] All job steps validated
- [ ] Edge cases covered
- [ ] Integration scenarios tested

---

## 7. Test Execution Plan

### 7.1 Pre-Test Checklist

- [ ] DevOps Agent confirms fixes are complete
- [ ] Git Agent has created testing branch
- [ ] QA Agent has reviewed configurations
- [ ] All validation scripts are ready
- [ ] Test environment is prepared

### 7.2 Test Execution Order

1. **Phase 1: Core Validation** (TC001-TC005)
   - Lockfile validation
   - npm ci testing
   - Workflow syntax checks

2. **Phase 2: Dependabot Testing** (TC006-TC008)
   - Actor detection
   - CI monitoring
   - Permission verification

3. **Phase 3: Lockfile Maintenance** (TC009-TC010)
   - Update command
   - PR creation

4. **Phase 4: Edge Cases** (TC011-TC015)
   - Missing lockfile
   - Corrupted lockfile
   - Fork PRs

5. **Phase 5: Integration Tests** (TC016-TC018)
   - Full CI pipeline
   - Complete Dependabot flow
   - Complete lockfile maintenance

### 7.3 Test Execution Timeline

| Phase   | Duration | Dependencies     |
| :------ | :------- | :--------------- |
| Phase 1 | 30 min   | DevOps complete  |
| Phase 2 | 45 min   | Phase 1 complete |
| Phase 3 | 30 min   | Phase 2 complete |
| Phase 4 | 45 min   | Phase 3 complete |
| Phase 5 | 60 min   | Phase 4 complete |

**Total Estimated Time:** 3.5 hours

---

## 8. Coordination with Other Agents

### 8.1 DevOps Agent Handoff

**Input Expected:**

- List of all workflow changes
- Documentation of fixes applied
- Any configuration updates
- Known limitations

**Output from Testing Agent:**

- Test execution results
- Bug reports (if any)
- Performance metrics
- Recommendations

---

### 8.2 QA Agent Coordination

**QA Agent Provides:**

- Validation checklist
- Configuration review findings
- Risk assessment
- Acceptance criteria

**Testing Agent Incorporates:**

- QA checklist items into test cases
- Risk-based prioritization
- Security and compliance checks

---

### 8.3 Git Agent Coordination

**Git Agent Provides:**

- Testing branch created
- Clean repository state
- Access to test PRs

**Testing Agent Provides:**

- Test results to include in commit
- Documentation of test execution
- Merge recommendation

---

## 9. Test Reporting

### 9.1 Test Results Format

```json
{
  "testRunId": "TR-2026-01-14-001",
  "timestamp": "2026-01-14T20:00:00Z",
  "executor": "Testing Agent",
  "summary": {
    "total": 18,
    "passed": 18,
    "failed": 0,
    "skipped": 0
  },
  "results": [
    {
      "testCase": "TC001",
      "name": "Lockfile Existence and Validity",
      "status": "passed",
      "duration": "00:00:05"
    }
  ]
}
```

### 9.2 Failure Escalation

If any test fails:

1. Document failure details
2. Capture logs and error messages
3. Notify DevOps Agent immediately
4. Create issue for fix
5. Re-test after fix

### 9.3 Success Declaration

All criteria met:

- [ ] All critical tests pass
- [ ] No workflow syntax errors
- [ ] npm ci works in all scenarios
- [ ] Dependabot auto-merge functional
- [ ] Performance targets met
- [ ] QA Agent checklist satisfied

---

## 10. Appendix

### 10.1 Test Environment Requirements

- Node.js 20+
- npm 9+
- git 2.40+
- GitHub CLI (gh)
- act (for local workflow testing)

### 10.2 Reference Documentation

- GitHub Actions Documentation
- npm ci Documentation
- Dependabot Documentation
- Repository AGENTS.md

### 10.3 Contact Information

- DevOps Agent: Workflow configuration fixes
- QA Agent: Configuration validation
- Git Agent: Repository operations
- Testing Agent: Test execution and reporting

---

**End of Plan**
