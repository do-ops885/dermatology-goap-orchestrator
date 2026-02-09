# Repository Audit Plan

**Created:** 2026-02-09  
**Coordinator:** Multi-Agent GitHub Actions Debug System  
**Scope:** Identify pre-existing workflow issues affecting all PRs

## 1. Overview

This plan audits all GitHub Actions workflows in the repository to identify pre-existing configuration issues, security vulnerabilities, and maintenance debt that could impact future PRs.

## 2. Discovery Phase Actions

### 2.1 Workflow Enumeration

- Command: `gh workflow list --json id,name,path,state`
- Output: Complete inventory of all workflows

### 2.2 Workflow Health Assessment

For each workflow:

- Command: `gh run list --workflow=<workflow-name> --json databaseId,status,conclusion,headBranch,createdAt --limit 10`
- Calculate failure rate for last 10 runs
- Identify workflows that have never run

### 2.3 Configuration File Analysis

- Read all files in `.github/workflows/`
- Parse YAML for structural issues
- Document all workflow configurations

## 3. Audit Strategy

### 3.1 Action Version Audit

- Check all `uses:` statements
- Flag deprecated versions:
  - `actions/checkout@v1` or `@v2` → should be `@v4`
  - `actions/setup-node@v1` or `@v2` → should be `@v4`
  - `actions/upload-artifact@v2` or `@v3` → should `@v4`
  - Any action with version < 2 years old

### 3.2 Permissions Audit

- Check for missing `permissions:` blocks
- Verify minimal required permissions (principle of least privilege)
- Flag overly broad permissions (e.g., `permissions: write-all`)

### 3.3 Security Audit

- Check for `pull_request_target` usage without safeguards
- Flag hardcoded secrets or credentials
- Check for insecure script injection patterns
- Verify `actions/github-script` usage is safe

### 3.4 Syntax & Best Practices Audit

- Deprecated Node.js versions (12, 14, 16)
- Deprecated `set-output` commands
- Missing `concurrency` controls
- Missing `timeout-minutes`
- Invalid `on:` triggers

### 3.5 Maintenance Audit

- Workflows not run in >90 days
- Redundant or duplicate workflows
- Unused inputs/outputs

## 4. Priority Classification

### Critical (Fix Immediately)

- Security vulnerabilities
- Broken workflows (100% failure rate)
- Missing required permissions blocking all PRs

### High (Fix Soon)

- Outdated action versions (CVE risk)
- Deprecated syntax (will break soon)
- High failure rate (>50%)

### Medium (Fix When Convenient)

- Missing best practices
- Missing timeouts
- Minor deprecation warnings

### Low (Optional)

- Style improvements
- Unused workflow cleanup
- Documentation updates

## 5. Success Criteria

- All critical and high-priority issues documented
- All workflows have acceptable failure rates (<20%)
- No security vulnerabilities in default branch workflows
- Clear prioritization for remediation

## 6. Output Artifacts

- `plans/repository_workflows_inventory.json` - All workflows + health metrics
- `plans/repository_issues.md` - Categorized issues list

## 7. Dependencies

- Access to `.github/workflows/` directory
- GitHub CLI permissions to list workflows and runs
- Ability to read workflow YAML files
