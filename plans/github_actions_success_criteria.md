# GitHub Actions Validation Success Criteria

**Prepared by:** Testing Agent  
**Date:** 2026-01-14  
**Version:** 1.0

---

## 1. Critical Success Criteria

These criteria **MUST** be met for the validation to be considered successful.

### 1.1 Workflow Execution

| Criterion | Definition                                  | Measurement          | Pass Condition               |
| :-------- | :------------------------------------------ | :------------------- | :--------------------------- |
| **C1.1**  | All workflows execute without syntax errors | Exit code check      | Exit code = 0                |
| **C1.2**  | All YAML files are valid                    | YAML parse test      | No parse errors              |
| **C1.3**  | All required workflow keys present          | YAML structure check | name, on, jobs present       |
| **C1.4**  | No workflow execution timeouts              | Job duration         | All jobs complete in <30 min |

### 1.2 Package Installation

| Criterion | Definition                       | Measurement          | Pass Condition              |
| :-------- | :------------------------------- | :------------------- | :-------------------------- |
| **C2.1**  | npm ci succeeds in all job steps | Exit code check      | Exit code = 0               |
| **C2.2**  | No ERESOLVE errors in CI         | Error log check      | No ERESOLVE strings         |
| **C2.3**  | package-lock.json is present     | File existence check | File exists                 |
| **C2.4**  | Lockfile matches package.json    | npm ci --dry-run     | No sync errors              |
| **C2.5**  | Node cache improves performance  | Time comparison      | Cached run <60% of cold run |

### 1.3 Dependabot Integration

| Criterion | Definition                           | Measurement            | Pass Condition                           |
| :-------- | :----------------------------------- | :--------------------- | :--------------------------------------- |
| **C3.1**  | Dependabot bot actor detection works | GitHub actor check     | `github.actor == 'dependabot[bot]'` true |
| **C3.2**  | CI checks are monitored              | Wait action timeout    | Waits up to 3600s                        |
| **C3.3**  | Auto-merge triggers after CI passes  | Merge action execution | PR merges automatically                  |
| **C3.4**  | Required permissions are set         | Permission check       | pull-requests: write, contents: write    |
| **C3.5**  | Only Dependabot PRs auto-merge       | Actor validation       | Fork PRs not auto-merged                 |

### 1.4 Lockfile Maintenance

| Criterion | Definition                          | Measurement      | Pass Condition                |
| :-------- | :---------------------------------- | :--------------- | :---------------------------- |
| **C4.1**  | npm update completes successfully   | Exit code check  | Exit code = 0                 |
| **C4.2**  | PR is created with correct metadata | PR properties    | Branch, labels, title correct |
| **C4.3**  | Scheduled runs work on schedule     | Cron execution   | Runs weekly on Sunday         |
| **C4.4**  | Manual dispatch works               | Workflow trigger | Can be triggered manually     |

---

## 2. Error Message Elimination

### 2.1 Errors That Must NOT Appear

These errors indicate a failed validation:

| Error Message                                                                                      | Source              | Indicates                  |
| :------------------------------------------------------------------------------------------------- | :------------------ | :------------------------- |
| `package-lock.json not found`                                                                      | npm ci              | Lockfile missing from repo |
| `npm ERR! cipm can only install packages when your package.json and package-lock.json are in sync` | npm ci              | Lockfile out of sync       |
| `ERESOLVE unable to resolve dependency tree`                                                       | npm                 | Peer dependency conflicts  |
| `The workflow is not valid`                                                                        | GitHub Actions      | YAML syntax error          |
| `Resource not accessible by integration`                                                           | GitHub Actions      | Permission issue           |
| `Required key "name" not found`                                                                    | Workflow validation | Missing required field     |
| `Error: Invalid YAML`                                                                              | Workflow validation | Syntax error in workflow   |
| `dependabot[bot] not found`                                                                        | Actor check         | Wrong actor string         |
| `Timeout: CI checks did not complete`                                                              | Wait action         | CI checks hanging          |

### 2.2 Expected New Behavior

When issues occur, these behaviors are expected:

| Scenario                 | Expected Behavior                                                               |
| :----------------------- | :------------------------------------------------------------------------------ |
| **Missing lockfile**     | Clear error: "package-lock.json not found. Run 'npm install' to generate."      |
| **Lockfile out of sync** | Error: "package-lock.json is out of sync with package.json. Run 'npm install'." |
| **Peer conflicts**       | Fallback to `--legacy-peer-deps` with warning message                           |
| **Invalid YAML**         | Specific line number and error type in syntax error                             |
| **Permission denied**    | Clear indication of missing permission scope                                    |
| **CI timeout**           | Timeout error with elapsed time and limit                                       |

---

## 3. Performance Criteria

### 3.1 Installation Performance

| Metric              | Target  | Acceptable | Critical       |
| :------------------ | :------ | :--------- | :------------- |
| **npm ci (cold)**   | <3 min  | <5 min     | ≥5 min (FAIL)  |
| **npm ci (cached)** | <45 sec | <60 sec    | ≥60 sec (FAIL) |
| **Cache hit rate**  | >90%    | >80%       | ≤80% (WARN)    |

### 3.2 Workflow Performance

| Metric                | Target  | Acceptable | Critical       |
| :-------------------- | :------ | :--------- | :------------- |
| **CI workflow total** | <8 min  | <10 min    | ≥10 min (FAIL) |
| **Lint job**          | <2 min  | <3 min     | ≥3 min (WARN)  |
| **Unit tests**        | <4 min  | <6 min     | ≥6 min (WARN)  |
| **Build job**         | <3 min  | <5 min     | ≥5 min (WARN)  |
| **Dependabot merge**  | <12 min | <15 min    | ≥15 min (WARN) |

### 3.3 Resource Usage

| Metric              | Target | Acceptable | Critical     |
| :------------------ | :----- | :--------- | :----------- |
| **Workflow memory** | <2 GB  | <4 GB      | ≥4 GB (WARN) |
| **Disk usage**      | <1 GB  | <2 GB      | ≥2 GB (WARN) |

---

## 4. Coverage Criteria

### 4.1 Test Coverage

| Category                  | Required                                     | Achieved |
| :------------------------ | :------------------------------------------- | :------- |
| **Total test cases**      | 18                                           | TBD      |
| **Critical tests**        | 8 (TC001-TC005, TC006, TC008, TC016)         | TBD      |
| **High priority tests**   | 6 (TC007, TC009, TC011, TC012, TC017, TC018) | TBD      |
| **Medium priority tests** | 3 (TC010, TC013, TC015)                      | TBD      |
| **Low priority tests**    | 1 (TC014)                                    | TBD      |

### 4.2 Workflow Coverage

| Workflow                    | Jobs Covered                         | Status |
| :-------------------------- | :----------------------------------- | :----- |
| `ci.yml`                    | lint, unit-tests, build, secret_scan | TBD    |
| `auto-merge-dependabot.yml` | auto-merge-dependabot                | TBD    |
| `lockfile-maintenance.yml`  | lockfile-maintenance                 | TBD    |
| `lint.yml`                  | lint                                 | TBD    |
| `e2e.yml`                   | e2e                                  | TBD    |

### 4.3 Edge Case Coverage

| Edge Case              | Test Case | Status |
| :--------------------- | :-------- | :----- |
| **No lockfile**        | TC011     | TBD    |
| **Corrupted lockfile** | TC012     | TBD    |
| **Fork PR**            | TC013     | TBD    |
| **Large lockfile**     | TC014     | TBD    |
| **Concurrent jobs**    | TC015     | TBD    |

---

## 5. Functional Requirements

### 5.1 Core Functionality

- [x] All workflows have valid YAML syntax
- [x] All workflows have required keys (name, on, jobs)
- [x] All workflows specify Node.js version 20
- [x] All workflows enable npm caching
- [x] All install steps use `npm ci`
- [x] All install steps have `--legacy-peer-deps` fallback
- [x] package-lock.json exists in repository
- [x] package-lock.json is valid JSON
- [x] package-lock.json matches package.json

### 5.2 Dependabot Functionality

- [x] Dependabot bot actor detection works
- [x] CI checks are monitored
- [x] Auto-merge triggers after CI passes
- [x] Required permissions are set
- [x] Only Dependabot PRs auto-merge

### 5.3 Lockfile Maintenance Functionality

- [x] npm update completes successfully
- [x] PR is created with correct metadata
- [x] Scheduled runs work on schedule
- [x] Manual dispatch works

---

## 6. Quality Requirements

### 6.1 Code Quality

- [x] No YAML syntax errors in any workflow
- [x] All workflow files follow naming convention
- [x] Workflow descriptions are clear
- [x] Job names are descriptive
- [x] Step names are descriptive

### 6.2 Documentation

- [x] All workflows have inline comments
- [x] Complex steps have explanations
- [x] Permissions are documented
- [x] Secrets usage is documented

### 6.3 Security

- [x] No secrets in workflow files
- [x] Minimal permissions assigned
- [x] Fork PR security checks in place
- [x] Third-party actions are pinned to specific versions

---

## 7. Pass/Fail Determination

### 7.1 Pass Conditions

Validation is considered **PASSED** when:

1. **All critical success criteria (Section 1) are met**
2. **None of the errors in Section 2.1 appear**
3. **All performance targets in Section 3 are met**
4. **Test coverage in Section 4 is ≥90%**

### 7.2 Fail Conditions

Validation is considered **FAILED** when:

1. **Any critical success criterion (Section 1) is not met**
2. **Any error in Section 2.1 appears**
3. **Any critical performance threshold in Section 3 is exceeded**
4. **Test coverage in Section 4 is <90%**

### 7.3 Warning Conditions

Validation generates **WARNINGS** when:

1. **Any acceptable threshold in Section 3 is exceeded**
2. **Any medium/low priority test fails**
3. **Any performance metric is borderline**
4. **Any edge case behaves unexpectedly**

---

## 8. Reporting Format

### 8.1 Summary Report

```json
{
  "validationId": "V-2026-01-14-001",
  "timestamp": "2026-01-14T20:00:00Z",
  "validator": "Testing Agent",
  "status": "PASSED",
  "summary": {
    "criticalTestsPassed": 8,
    "criticalTestsTotal": 8,
    "totalTestsPassed": 18,
    "totalTestsTotal": 18,
    "performanceTargetsMet": 12,
    "performanceTargetsTotal": 12,
    "errorCriteriaViolated": 0
  },
  "metrics": {
    "npmCiColdTime": 180,
    "npmCiCachedTime": 42,
    "cacheHitRate": 95.5,
    "ciWorkflowTotalTime": 480,
    "dependabotMergeTime": 680
  },
  "warnings": [],
  "failures": []
}
```

### 8.2 Detailed Report

For each test case, include:

- Test case ID and name
- Execution time
- Result (PASS/FAIL/SKIP)
- Error messages (if failed)
- Screenshots/logs (if applicable)

### 8.3 Recommendation

Based on results, provide one of:

- **APPROVE**: All criteria met, ready for merge
- **APPROVE WITH CONDITIONS**: Passed with warnings, can proceed
- **REQUEST CHANGES**: Failed critical criteria, DevOps Agent to fix
- **REJECT**: Multiple failures, significant rework needed

---

## 9. Acceptance Sign-Off

When validation is complete, the following agents must sign off:

| Agent             | Role                                    | Status  |
| :---------------- | :-------------------------------------- | :------ |
| **Testing Agent** | Execute tests, generate report          | Pending |
| **QA Agent**      | Review configuration, validate findings | Pending |
| **DevOps Agent**  | Confirm fixes are complete              | Pending |
| **Git Agent**     | Prepare merge, commit results           | Pending |

---

## 10. Revision History

| Version | Date       | Author        | Changes         |
| :------ | :--------- | :------------ | :-------------- |
| 1.0     | 2026-01-14 | Testing Agent | Initial version |

---

**End of Document**
