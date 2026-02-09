# PR #59 GitHub Actions Fix - Master Orchestration Plan

**Date:** 2026-02-09  
**Target:** https://github.com/do-ops885/dermatology-goap-orchestrator/pull/59  
**Status:** In Progress  
**Orchestrator:** Multi-Agent Coordination System

---

## Current Status (from gh CLI)

| Check                            | Status         | Issue                     |
| -------------------------------- | -------------- | ------------------------- |
| Secret scanning (gitleaks)       | ✅ SUCCESS     | -                         |
| Bundle Size & Performance        | ✅ SUCCESS     | -                         |
| codecov/patch                    | ✅ SUCCESS     | -                         |
| CodeQL                           | ✅ SUCCESS     | -                         |
| Security Audit                   | ✅ SUCCESS     | -                         |
| Build Production Bundle          | ✅ SUCCESS     | -                         |
| SonarCloud Scan                  | ✅ SUCCESS     | -                         |
| Unit Tests                       | ✅ SUCCESS     | -                         |
| Dependency Review                | ✅ SUCCESS     | -                         |
| NPM Audit                        | ✅ SUCCESS     | -                         |
| Formatting, Lint & Type Check    | ✅ SUCCESS     | -                         |
| Code Complexity                  | ✅ SUCCESS     | -                         |
| CodeQL Analysis (javascript)     | ✅ SUCCESS     | -                         |
| **SonarCloud Code Analysis**     | ❌ **FAILURE** | Coverage/threshold issues |
| **bundle-size**                  | ❌ **FAILURE** | Permission error (403)    |
| **Lighthouse Performance Audit** | ❌ **FAILURE** | ES module error           |
| E2E Tests (1, 2, 3)              | ⏳ IN_PROGRESS | Long-running              |
| dependabot-automerge             | ⏭️ SKIPPED     | Not triggered             |

**Failures to Fix:** 3 critical

---

## Agent Groups

### Group 1: Workflow Fixers (Priority: Critical)

| Agent    | Skill  | Task                            | Target File                                  |
| -------- | ------ | ------------------------------- | -------------------------------------------- |
| Agent-01 | devops | Fix bundle-size permissions     | `.github/workflows/bundle-size.yml`          |
| Agent-02 | devops | Fix Lighthouse ES module error  | `lighthouserc.js` → `lighthouserc.cjs`       |
| Agent-03 | devops | Fix dependabot-automerge syntax | `.github/workflows/dependabot-automerge.yml` |

### Group 2: Code Quality (Priority: High)

| Agent    | Skill          | Task                            | Target                                    |
| -------- | -------------- | ------------------------------- | ----------------------------------------- |
| Agent-04 | security-audit | Fix SonarCloud analysis failure | Coverage config, sonar-project.properties |
| Agent-05 | testing        | Verify unit test stability      | `tests/` directory                        |
| Agent-06 | devops         | Optimize CI workflow            | `.github/workflows/ci.yml`                |

### Group 3: Testing & Verification (Priority: Medium)

| Agent    | Skill                          | Task                        | Target                                    |
| -------- | ------------------------------ | --------------------------- | ----------------------------------------- |
| Agent-07 | testing                        | Fix E2E test flakiness      | `tests/e2e/`, `.github/workflows/e2e.yml` |
| Agent-08 | reliability-engineering        | Add test timeouts & retries | Workflow configs                          |
| Agent-09 | playwright-e2e-test-generation | Optimize Playwright config  | `playwright.config.ts`                    |

### Coordinator

| Agent    | Skill             | Task                                                   |
| -------- | ----------------- | ------------------------------------------------------ |
| Agent-00 | goap-orchestrator | Coordinate all agents, manage handoffs, verify results |

---

## Execution Sequence

```
Phase 1: Group 1 (Workflow Fixers) - Parallel
  ├─ Agent-01: Fix bundle-size permissions
  ├─ Agent-02: Fix Lighthouse config
  └─ Agent-03: Fix dependabot-automerge

Phase 2: Group 2 (Code Quality) - Parallel (after Group 1)
  ├─ Agent-04: Fix SonarCloud
  ├─ Agent-05: Verify tests
  └─ Agent-06: Optimize CI

Phase 3: Group 3 (Testing) - Parallel (after Group 2)
  ├─ Agent-07: Fix E2E tests
  ├─ Agent-08: Add reliability
  └─ Agent-09: Optimize Playwright

Phase 4: Verification & Loop
  ├─ Re-run gh pr checks
  ├─ If failures: Re-spawn relevant agents
  └─ Repeat until all pass

Phase 5: Cleanup
  ├─ Archive plan
  ├─ Document changes
  └─ Close orchestration
```

---

## Handoff Protocol

1. **Agent Completion:** Each agent writes status to `plans/41_pr59_agent_status.md`
2. **Coordination Check:** Agent-00 polls status file every 2 minutes
3. **Re-spawn Trigger:** If agent fails or timeout, Agent-00 re-spawns with context
4. **Success Criteria:** All GitHub Actions show ✅ SUCCESS

---

## Fix Specifications

### Fix 1: bundle-size.yml (Agent-01)

```yaml
# Add permissions block:
permissions:
  contents: read
  pull-requests: write
```

### Fix 2: lighthouserc.js → lighthouserc.cjs (Agent-02)

```bash
mv lighthouserc.js lighthouserc.cjs
# Update workflow reference if needed
```

### Fix 3: dependabot-automerge.yml (Agent-03)

```yaml
# Change:
gh pr edit "${{ github.event.pull_request.number }}" --add-automerge
# To:
gh pr merge "${{ github.event.pull_request.number }}" --auto --squash
```

### Fix 4: SonarCloud (Agent-04)

- Check coverage thresholds
- Verify sonar-project.properties
- Ensure test reports are generated

---

## Success Criteria

- [ ] bundle-size: SUCCESS
- [ ] Lighthouse Performance Audit: SUCCESS
- [ ] SonarCloud Code Analysis: SUCCESS
- [ ] All E2E Tests: SUCCESS
- [ ] All other checks remain SUCCESS

---

## Status Log

| Time       | Event                         |
| ---------- | ----------------------------- |
| 2026-02-09 | Plan created, spawning agents |

---

**Next Update:** After Agent-00 coordination begins
