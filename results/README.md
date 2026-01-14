# Test Results Directory

This directory stores test execution results and logs for GitHub Actions validation.

## Contents

- `lockfile-validation.log` - Lockfile validation script output
- `workflow-validation.log` - Workflow validation script output
- `npm-ci-test.log` - npm ci test script output
- `test-summary.md` - Test execution summary
- `test-report.json` - Detailed test report (JSON format)

## Usage

Results are automatically generated when running validation scripts:

```bash
# Generate all results
./scripts/validate-lockfile.sh > results/lockfile-validation.log 2>&1
./scripts/validate-workflows.sh > results/workflow-validation.log 2>&1
./scripts/test-npm-ci.sh all > results/npm-ci-test.log 2>&1
```

## Cleanup

After merging changes, clean results directory:

```bash
rm -rf results/*
```

**Note:** Do NOT delete this directory, only its contents.
