# GitHub Actions Developer Guide

**Quick reference for dependency resolution and pre-commit workflows.**

---

## 🚀 Quick Start

### After Pulling Latest Changes

```bash
# 1. Pull latest changes
git pull

# 2. Update dependencies
rm -rf node_modules package-lock.json
npm install

# 3. Verify everything works
npm run lint
npm run typecheck
npm test
```

---

## 🔍 Pre-Commit Workflow

### What Happens When You Commit

1. **Dependency Check** - Verifies no peer dependency conflicts
2. **Lint-Staged** - Formats and lints only staged files
3. **Secret Detection** - Scans for potential secrets
4. **Type Check** - Ensures TypeScript type safety
5. **LOC Check** - Warns about files > 500 lines

### Skipping Pre-Commit Checks

**Use with caution! Only skip if you know what you're doing.**

```bash
# Skip all pre-commit checks
git commit --no-verify -m "message"

# Run unit tests in pre-commit
RUN_UNIT_TESTS=1 git commit -m "message"
```

---

## 📦 Dependency Issues

### Common Error: Peer Dependency Conflict

**Error:**

```
npm error ERESOLVE could not resolve
npm error peer prettier@"^2.0.0" from pretty-quick@3.1.9
```

**Solution:**

1. Update dependencies: `npm install`
2. Check dependencies script: `bash scripts/check-dependencies.sh`
3. Review `package.json` for conflicting versions

### Verifying Dependency Resolution

```bash
# Quick check (recommended)
bash scripts/check-dependencies.sh

# Full install test
npm install --dry-run

# Clean install (for CI environment)
rm -rf node_modules package-lock.json
npm ci
```

---

## 🔧 Pre-Commit Scripts

### Quality Gate Script

**Full Quality Gate (includes tests):**

```bash
./scripts/quality-gate.sh
```

**Fast Mode (format, lint, typecheck, secrets):**

```bash
./scripts/quality-gate.sh --fast
```

**Auto-fix Issues:**

```bash
./scripts/quality-gate.sh --fix
```

**Skip Specific Checks:**

```bash
# Skip formatting (handled by lint-staged)
./scripts/quality-gate.sh --skip-format

# Skip linting (handled by lint-staged)
./scripts/quality-gate.sh --skip-lint

# Skip tests
./scripts/quality-gate.sh --skip-tests

# Skip build
./scripts/quality-gate.sh --skip-build
```

### Dependency Check Script

```bash
# Run standalone check
bash scripts/check-dependencies.sh

# Automatically runs in pre-commit hook
git commit -m "message"
```

### Secret Scan Script

```bash
# Scan staged files
bash scripts/pre-commit-secrets.sh

# Automatically runs in pre-commit hook
```

### Max LOC Check

```bash
# Check for files > 500 lines
bash scripts/check-max-loc.sh

# Automatically runs in quality gate
```

---

## 🏗️ GitHub Actions

### Workflow Status

| Workflow     | Status   | Purpose                              |
| ------------ | -------- | ------------------------------------ |
| CI           | ✅ Fixed | Lint, typecheck, unit tests, build   |
| Lint         | ✅ Fixed | ESLint check                         |
| Security     | ✅ Fixed | CodeQL, dependency review, npm audit |
| Code Quality | ✅ Fixed | SonarCloud, complexity check         |
| E2E Tests    | ✅ Fixed | Playwright end-to-end tests          |

### All Workflows Include

```yaml
- name: Install dependencies
  run: npm ci || npm ci --legacy-peer-deps
```

**Rationale:** Fallback to `--legacy-peer-deps` prevents CI failures during transitions. Primary fix (removing `pretty-quick`) should resolve conflicts permanently.

---

## 🐛 Troubleshooting

### Issue: Pre-commit hook fails

**Try:**

```bash
# Update dependencies
npm install

# Check for conflicts
bash scripts/check-dependencies.sh

# Run quality gate manually
./scripts/quality-gate.sh --fix
```

### Issue: `npm ci` fails in CI

**Check:**

1. Are `package.json` and `package-lock.json` in sync?
2. Is `npm install` working locally?
3. Are there peer dependency conflicts?

**Fix:** Run `npm install` locally, commit updated `package-lock.json`.

### Issue: Formatting not applied

**Check:**

```bash
# Run manually
npm run format

# Run lint-staged directly
npx lint-staged

# Check .husky/pre-commit hook
cat .husky/pre-commit
```

### Issue: Type check fails

**Try:**

```bash
# Run typecheck manually
npm run typecheck

# Check TypeScript version
npm list typescript

# Clear cache
rm -rf node_modules/.vite
```

---

## 📋 Pre-Commit Checklist

Before committing, ensure:

- [ ] `npm install` runs without errors
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (if applicable)
- [ ] No secrets in staged files
- [ ] No files > 500 lines (per `AGENTS.md`)
- [ ] Dependencies are up to date

---

## 🎯 Best Practices

### 1. Keep Dependencies Updated

```bash
# Check for updates
npm outdated

# Update all packages
npm update

# Update specific package
npm install package-name@latest
```

### 2. Use Semantic Commit Messages

Pre-commit hook uses `commitlint` to enforce conventional commits:

```
feat: add new feature
fix: fix bug
docs: update documentation
style: format code
refactor: refactor code
test: add tests
chore: update dependencies
```

### 3. Run Tests Before Pushing

```bash
# Run all tests
npm test

# Run specific test file
npm test path/to/test.test.ts

# Run with coverage
npm test -- --coverage
```

### 4. Monitor CI Workflows

Check workflow status:

```bash
gh run list
gh run view [run-id]
gh run watch
```

---

## 🔗 Related Resources

- [`plans/16_github_actions_fix.md`](./16_github_actions_fix.md) - Detailed fix plan
- [`plans/17_github_actions_fix_implementation.md`](./17_github_actions_fix_implementation.md) - Implementation summary
- [`AGENTS.md`](../AGENTS.md) - Code quality guidelines
- [`package.json`](../package.json) - All available scripts

---

## 📞 Getting Help

### For Dependency Issues

1. Check [`scripts/check-dependencies.sh`](../scripts/check-dependencies.sh) output
2. Review [`plans/16_github_actions_fix.md`](./16_github_actions_fix.md)
3. Check `npm` documentation: `npm help install`

### For Pre-Commit Issues

1. Run quality gate manually: `./scripts/quality-gate.sh`
2. Check Husky logs: `.husky/`
3. Review `lint-staged` configuration in `package.json`

### For CI/CD Issues

1. Check GitHub Actions logs in repository
2. Review workflow files in `.github/workflows/`
3. Contact DevOps Lead (per `plans/03_devops_workflow.md`)

---

**Last Updated:** 2026-01-14
**Status:** ✅ All workflows operational
