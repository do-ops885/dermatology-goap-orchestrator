# GitHub Repository Configuration

This document outlines the 2025 best practices configuration for the dermatology-goap-orchestrator repository.

## Repository Settings

### Auto-Merge Configuration

To enable auto-merge for dependency updates and simple PRs:

```bash
# Enable auto-merge for the repository
gh repo edit --enable-auto-merge --delete-branch-on-merge --allow-update-branch
```

### Branch Protection Rules

Configure branch protection for `main`:

```bash
# Set up branch protection (requires admin access)
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  repos/do-ops885/dermatology-goap-orchestrator/branches/main/protection \
  -f enforce_admins=true \
  -f required_status_checks='{"strict":true,"contexts":["CI","Security","Code Quality","E2E Tests"]}' \
  -f required_pull_request_reviews='{"required_approving_review_count":1}' \
  -f restrictions=null \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

## GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)

- **Triggers**: Push/PR to `main`
- **Jobs**: Lint, Unit Tests, Build
- **2025 Best Practices**:
  - Separate jobs for better parallelization
  - Code coverage upload to Codecov
  - Artifact retention for 7 days
  - Node.js 20 with npm caching

### Security Workflow (`.github/workflows/security.yml`)

- **Triggers**: Push/PR to `main`, Weekly schedule
- **Jobs**: CodeQL, Dependency Review, NPM Audit
- **2025 Best Practices**:
  - Extended security queries
  - License deny-listing
  - Automated dependency review on PRs

### E2E Workflow (`.github/workflows/e2e.yml`)

- **Triggers**: Push/PR to `main`, Weekly schedule
- **Jobs**: Playwright E2E Tests
- **2025 Best Practices**:
  - Artifact uploads for reports, videos, test results
  - Build application before testing
  - All browser dependencies installed

### Code Quality Workflow (`.github/workflows/code-quality.yml`)

- **Triggers**: Push/PR to `main`
- **Jobs**: SonarCloud Scan, Complexity Check
- **2025 Best Practices**:
  - Code complexity validation (max 500 LOC per file)
  - SonarCloud integration for code quality metrics
  - Fetch depth 0 for accurate analysis

### Release Workflow (`.github/workflows/release.yml`)

- **Triggers**: Git tags matching `v*.*.*`
- **Jobs**: Create GitHub Release
- **2025 Best Practices**:
  - Automated changelog generation
  - Build artifact attachment
  - Tag-based release management

### Auto-Merge Workflow (`.github/workflows/auto-merge-dependabot.yml`)

- **Triggers**: Dependabot PRs
- **Jobs**: Auto-merge dependency updates
- **2025 Best Practices**:
  - Waits for CI checks to pass
  - Auto-merges minor/patch updates
  - Requires Dependabot bot as actor

### Stale Workflow (`.github/workflows/stale.yml`)

- **Triggers**: Weekly schedule
- **Jobs**: Close stale issues/PRs
- **2025 Best Practices**:
  - 14-day stale threshold
  - 7-day close threshold
  - Exemptions for bug/security labels

### Lockfile Maintenance Workflow (`.github/workflows/lockfile-maintenance.yml`)

- **Triggers**: Weekly schedule, Manual dispatch
- **Jobs**: Update npm lockfile
- **2025 Best Practices**:
  - Automated PR creation
  - Auto-merge label for dependency updates
  - Weekly schedule on Sundays

## Dependabot Configuration (`.github/dependabot.yml`)

### Configuration Details:

- **Schedule**: Weekly on Mondays at 09:00 UTC
- **Ecosystem**: npm
- **Open PR Limit**: 10
- **Labels**: `dependencies`, `javascript`, `automerge`
- **Versioning Strategy**: Increase (minor/patch)
- **Groups**:
  - `react-related`: React ecosystem
  - `tensorflow-related`: TensorFlow.js libraries
  - `ai-libraries`: AI/ML libraries
  - `testing`: Testing frameworks

### Auto-Merge Criteria:

- Minor and patch version updates
- All CI checks must pass
- PRs from Dependabot bot only
- Labels: `dependencies`, `javascript`, `automerge`

## Secrets Required

Add these secrets to your repository:

| Secret          | Purpose                       | Required  |
| --------------- | ----------------------------- | --------- |
| `GITHUB_TOKEN`  | Built-in token for API access | Automatic |
| `CODECOV_TOKEN` | Codecov coverage upload       | Optional  |
| `SONAR_TOKEN`   | SonarCloud code analysis      | Optional  |

## Permissions by Workflow

| Workflow     | Contents | Security Events | Actions | Pull Requests |
| ------------ | -------- | --------------- | ------- | ------------- |
| CI           | Read     | Write           | Read    | -             |
| Security     | Read     | Write           | Read    | -             |
| E2E          | Read     | -               | -       | -             |
| Code Quality | Read     | -               | -       | Write         |
| Release      | Write    | -               | -       | -             |
| Auto-Merge   | -        | -               | -       | Write         |
| Stale        | -        | -               | -       | Write         |
| Lockfile     | Write    | -               | -       | Write         |

## 2025 Best Practices Summary

1. **Security-First**: Comprehensive security scanning with CodeQL, dependency review, and npm audit
2. **Type Safety**: TypeScript strict mode with `no-explicit-any` enforced
3. **Quality Gates**: Lint, test, and build must pass before merge
4. **Automation**: Auto-merge for dependency updates, stale PR cleanup
5. **Code Complexity**: Maximum 500 lines per file enforced
6. **Coverage Tracking**: Unit test coverage uploaded to Codecov
7. **E2E Testing**: Playwright tests with artifact retention
8. **Release Automation**: Tag-based releases with changelog generation
9. **Dependency Management**: Dependabot with grouped updates and auto-merge
10. **Observability**: SonarCloud integration for code quality metrics

## Setup Instructions

1. **Enable required repository settings**:

   ```bash
   gh repo edit --enable-auto-merge --delete-branch-on-merge --allow-update-branch
   ```

2. **Configure branch protection** (requires admin access):

   ```bash
   gh api --method PUT \
     -H "Accept: application/vnd.github+json" \
     repos/do-ops885/dermatology-goap-orchestrator/branches/main/protection \
     -f enforce_admins=true \
     -f required_status_checks='{"strict":true,"contexts":["CI","Security","Code Quality","E2E Tests"]}' \
     -f required_pull_request_reviews='{"required_approving_review_count":1}' \
     -f restrictions=null
   ```

3. **Add secrets** (optional but recommended):
   - `CODECOV_TOKEN`: Get from https://codecov.io/
   - `SONAR_TOKEN`: Get from https://sonarcloud.io/

4. **Install GitHub Apps** (optional):
   - Codecov: https://github.com/apps/codecov
   - SonarCloud: https://github.com/apps/sonarcloud

## Troubleshooting

### Auto-Merge Not Working

- Ensure `GITHUB_TOKEN` has `pull-requests: write` permission
- Check that required status checks are passing
- Verify PR has the `automerge` label

### Branch Protection API Errors

- The integration may not have admin permissions
- Manually configure branch protection in GitHub Settings
- Contact repository admin for elevated permissions

### Dependabot PRs Not Auto-Merging

- Ensure CI checks are passing
- Check that PR labels match criteria
- Verify workflow is not disabled

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [CodeQL Documentation](https://docs.github.com/en/code-security/code-scanning/codeql)
- [SonarCloud Documentation](https://docs.sonarsource.com/sonarcloud/)
- [Playwright Documentation](https://playwright.dev/)
