# GitHub Actions Validation - Quick Reference

**Prepared by:** Testing Agent  
**Date:** 2026-01-14

---

## Quick Links

| Document                  | Location                                        | Purpose                                  |
| :------------------------ | :---------------------------------------------- | :--------------------------------------- |
| **Test Plan**             | `plans/github_actions_validation_test_plan.md`  | Complete testing strategy and test cases |
| **Success Criteria**      | `plans/github_actions_success_criteria.md`      | Pass/fail conditions and metrics         |
| **Coordination Timeline** | `plans/github_actions_coordination_timeline.md` | Agent coordination and milestones        |

---

## Validation Scripts

### 1. Lockfile Validation

**Script:** `scripts/validate-lockfile.sh`  
**Purpose:** Verify package-lock.json exists and is valid

**Usage:**

```bash
./scripts/validate-lockfile.sh
```

**Checks:**

- File existence
- JSON syntax
- Sync with package.json
- Integrity verification
- .gitignore check

**Exit Codes:**

- `0`: All checks passed
- `1`: One or more checks failed

---

### 2. Workflow Validation

**Script:** `scripts/validate-workflows.sh`  
**Purpose:** Validate GitHub Actions workflow syntax and configuration

**Usage:**

```bash
./scripts/validate-workflows.sh
```

**Checks:**

- YAML syntax
- Required keys (name, on, jobs)
- Permissions section
- Node.js version consistency
- npm cache configuration
- Workflow-specific checks

**Exit Codes:**

- `0`: All workflows valid
- `1`: One or more workflows failed validation

---

### 3. npm ci Testing

**Script:** `scripts/test-npm-ci.sh`  
**Purpose:** Test npm ci behavior in different scenarios

**Usage:**

```bash
# Test clean install
./scripts/test-npm-ci.sh clean

# Test cache performance
./scripts/test-npm-ci.sh cached

# Test --legacy-peer-deps fallback
./scripts/test-npm-ci.sh legacy

# Test lockfile integrity
./scripts/test-npm-ci.sh integrity

# Run all scenarios
./scripts/test-npm-ci.sh all
```

**Exit Codes:**

- `0`: All tests in scenario passed
- `1`: One or more tests failed

---

## Test Cases Summary

### Core Functionality (TC001-TC005)

| ID    | Name                            | Priority | Script                  |
| :---- | :------------------------------ | :------- | :---------------------- |
| TC001 | Lockfile Existence and Validity | CRITICAL | `validate-lockfile.sh`  |
| TC002 | npm ci Success                  | CRITICAL | `test-npm-ci.sh clean`  |
| TC003 | npm ci Fallback                 | CRITICAL | `test-npm-ci.sh legacy` |
| TC004 | CI Workflow Syntax              | HIGH     | `validate-workflows.sh` |
| TC005 | Node Cache Configuration        | HIGH     | `validate-workflows.sh` |

### Dependabot Integration (TC006-TC008)

| ID    | Name                       | Priority | Script                  |
| :---- | :------------------------- | :------- | :---------------------- |
| TC006 | Dependabot Actor Detection | CRITICAL | Manual testing          |
| TC007 | CI Check Wait              | HIGH     | Manual testing          |
| TC008 | Auto-Merge Permissions     | CRITICAL | `validate-workflows.sh` |

### Lockfile Maintenance (TC009-TC010)

| ID    | Name                      | Priority | Script         |
| :---- | :------------------------ | :------- | :------------- |
| TC009 | Lockfile Update Command   | HIGH     | Manual testing |
| TC010 | PR Creation Configuration | MEDIUM   | Manual testing |

### Edge Cases (TC011-TC015)

| ID    | Name                        | Priority | Script                     |
| :---- | :-------------------------- | :------- | :------------------------- |
| TC011 | No Lockfile Scenario        | HIGH     | `test-npm-ci.sh integrity` |
| TC012 | Corrupted Lockfile Scenario | HIGH     | `test-npm-ci.sh integrity` |
| TC013 | Fork PR Scenario            | MEDIUM   | Manual testing             |
| TC014 | Large Lockfile Performance  | LOW      | `test-npm-ci.sh cached`    |
| TC015 | Concurrent Job Execution    | LOW      | Manual testing             |

### Integration Tests (TC016-TC018)

| ID    | Name                           | Priority | Script         |
| :---- | :----------------------------- | :------- | :------------- |
| TC016 | Full CI Pipeline               | CRITICAL | Manual testing |
| TC017 | Dependabot Full Flow           | CRITICAL | Manual testing |
| TC018 | Lockfile Maintenance Full Flow | HIGH     | Manual testing |

---

## Success Criteria Quick Reference

### Critical Pass Conditions (All Must Pass)

- [x] All workflows execute without syntax errors
- [x] All YAML files are valid
- [x] All required workflow keys present
- [x] All npm ci steps succeed
- [x] No ERESOLVE errors
- [x] package-lock.json present and valid
- [x] Dependabot bot actor detection works
- [x] Auto-merge triggers after CI passes
- [x] npm update completes successfully
- [x] PR is created with correct metadata

### Performance Targets

| Metric           | Target  | Acceptable | Critical |
| :--------------- | :------ | :--------- | :------- |
| npm ci (cold)    | <3 min  | <5 min     | ≥5 min   |
| npm ci (cached)  | <45 sec | <60 sec    | ≥60 sec  |
| CI workflow      | <8 min  | <10 min    | ≥10 min  |
| Dependabot merge | <12 min | <15 min    | ≥15 min  |

---

## Error Messages to Watch For

### Critical Errors (Should NOT appear)

- `package-lock.json not found`
- `npm ERR! cipm can only install packages when your package.json and package-lock.json are in sync`
- `ERESOLVE unable to resolve dependency tree`
- `The workflow is not valid`
- `Resource not accessible by integration`

### Expected Behavior

- Clear error messages if issues occur
- Graceful fallback to --legacy-peer-deps
- Informative workflow status

---

## Coordination Quick Reference

### Agent Roles

| Agent             | Primary Role                 |
| :---------------- | :--------------------------- |
| **DevOps Agent**  | Fix workflow issues          |
| **QA Agent**      | Validate configurations      |
| **Git Agent**     | Manage repository operations |
| **Testing Agent** | Execute test validation      |

### Handoff Flow

```
DevOps Agent (Fixes)
    ↓
QA Agent (Validates)
    ↓
Git Agent (Prepares env)
    ↓
Testing Agent (Executes tests)
    ↓
QA Agent (Reviews results)
    ↓
Git Agent (Merges or requests changes)
```

---

## Quick Commands

### Run All Validations

```bash
# Validate lockfile
./scripts/validate-lockfile.sh

# Validate workflows
./scripts/validate-workflows.sh

# Test npm ci (all scenarios)
./scripts/test-npm-ci.sh all
```

### Run Specific Scenarios

```bash
# Test clean install only
./scripts/test-npm-ci.sh clean

# Test cache performance only
./scripts/test-npm-ci.sh cached

# Test legacy peer deps only
./scripts/test-npm-ci.sh legacy

# Test lockfile integrity only
./scripts/test-npm-ci.sh integrity
```

### Local Workflow Testing

```bash
# Using act (install first)
brew install act

# Run CI workflow locally
act push -W .github/workflows/ci.yml

# Run with specific job
act -j lint -W .github/workflows/ci.yml
```

---

## Test Execution Checklist

### Before Testing

- [ ] DevOps Agent confirms fixes complete
- [ ] Git Agent created testing branch
- [ ] QA Agent validated configurations
- [ ] All validation scripts executable
- [ ] Test environment prepared

### During Testing

- [ ] Phase 1: Core validation complete
- [ ] Phase 2: Dependabot testing complete
- [ ] Phase 3: Lockfile maintenance complete
- [ ] Phase 4: Edge cases complete
- [ ] Phase 5: Integration tests complete

### After Testing

- [ ] Test report generated
- [ ] Performance metrics documented
- [ ] Findings shared with QA Agent
- [ ] QA Agent review complete
- [ ] Approval or change request issued

---

## Common Issues and Solutions

### Issue: Lockfile Validation Fails

**Symptoms:**

- `package-lock.json not found`
- `Lockfile out of sync`

**Solution:**

```bash
npm install
git add package-lock.json
git commit -m "fix: update package-lock.json"
```

---

### Issue: Workflow Validation Fails

**Symptoms:**

- `Invalid YAML`
- `Missing required keys`

**Solution:**

- Check YAML syntax with online validator
- Verify workflow has `name`, `on`, `jobs` keys
- Check indentation (YAML is sensitive)

---

### Issue: npm ci Fails

**Symptoms:**

- `ERESOLVE unable to resolve dependency tree`
- Peer dependency conflicts

**Solution:**

- Run `npm ci --legacy-peer-deps`
- Or run `npm install` to regenerate lockfile
- Review package.json dependencies

---

## Reporting

### Generate Test Report

After test execution, run:

```bash
# Collect results
./scripts/validate-lockfile.sh > results/lockfile-validation.log 2>&1
./scripts/validate-workflows.sh > results/workflow-validation.log 2>&1
./scripts/test-npm-ci.sh all > results/npm-ci-test.log 2>&1

# Create summary
cat > results/test-summary.md << 'EOF'
# Test Execution Summary

**Date:** 2026-01-14
**Executor:** Testing Agent

## Results

- Lockfile Validation: [PASS/FAIL]
- Workflow Validation: [PASS/FAIL]
- npm ci Clean: [PASS/FAIL]
- npm ci Cached: [PASS/FAIL]
- npm ci Legacy: [PASS/FAIL]
- npm ci Integrity: [PASS/FAIL]

## Performance Metrics

- npm ci (cold): XXs
- npm ci (cached): XXs
- Cache hit rate: XX%

## Issues Found

[List any issues found]

## Recommendations

[Provide recommendations]

EOF
```

---

## Next Steps

1. **Wait for DevOps Agent** to complete fixes
2. **Wait for QA Agent** to validate configurations
3. **Wait for Git Agent** to create testing branch
4. **Execute tests** using this guide
5. **Generate report** with findings
6. **Coordinate with QA Agent** for review
7. **Provide recommendation** for merge

---

**End of Quick Reference**
