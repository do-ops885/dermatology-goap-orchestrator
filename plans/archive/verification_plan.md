# Verification Plan

**Created:** 2026-02-09  
**Coordinator:** Multi-Agent GitHub Actions Debug System  
**Scope:** Validation strategy for all workflow fixes

## 1. Overview

This plan defines the verification methodology for ensuring all GitHub Actions fixes are effective and don't introduce regressions.

## 2. PR #59 Verification

### 2.1 Pre-Verification Checklist

- [ ] All patches for PR #59 issues have been applied
- [ ] No syntax errors in modified workflow files
- [ ] Changes committed (if needed)

### 2.2 Rerun Strategy

#### Option 1: Rerun Existing Runs (Preferred)

```bash
# For each failed run associated with PR #59
gh run rerun <run-id>
```

- Preserves PR check associations
- Maintains check run history

#### Option 2: Trigger New Runs

```bash
# If rerun fails or workflow file changed significantly
gh workflow run <workflow-file> --ref <pr-branch-name>
```

- Creates new check runs
- May not appear in PR checks immediately

#### Option 3: Push Empty Commit

```bash
git commit --allow-empty -m "Trigger workflow runs"
git push origin <pr-branch-name>
```

- Forces new runs with latest workflow
- All workflows for PR trigger

### 2.3 Verification Commands

```bash
# Check current PR status
gh pr view 59 --json state,mergeStateStatus,statusCheckRollup

# List all checks with status
gh pr checks 59

# Watch for changes (poll every 30 seconds)
while true; do
  gh pr checks 59
  sleep 30
done
```

### 2.4 Success Criteria

- All required checks show ✅ (passing)
- No ❌ (failing) checks related to CI/CD configuration
- Any remaining ❌ are genuine code/test failures (not workflow issues)

## 3. Repository-Wide Verification

### 3.1 Test Run Strategy

#### For Critical/High Priority Fixes

```bash
# Trigger workflow on main (if safe)
gh workflow run <workflow-file> --ref main
```

#### For Lower Priority Fixes

```bash
# Create test branch
git checkout -b workflow-fixes-test
git push origin workflow-fixes-test

# Trigger on test branch
gh workflow run <workflow-file> --ref workflow-fixes-test
```

### 3.2 Monitoring Period

- Watch for 15 minutes after triggering
- Check for immediate failures (configuration errors)
- Check for timeouts or hangs

### 3.3 Regression Testing

Compare before/after metrics:

```bash
# Before (from inventory)
cat plans/repository_workflows_inventory.json | jq '.workflows[] | {name, failure_rate}'

# After (fresh data)
gh run list --workflow=<workflow-name> --json conclusion --limit 10 | jq 'group_by(.conclusion) | map({conclusion: .[0].conclusion, count: length})'
```

### 3.4 Success Criteria

- No new failures introduced
- Previously failing workflows now passing
- Failure rates improved or maintained

## 4. Log Documentation

All verification activities logged to `plans/execution_log.md`:

```
[YYYY-MM-DD HH:MM:SS] VERIFICATION: PR #59 - Rerunning workflow <name>
[YYYY-MM-DD HH:MM:SS] VERIFICATION: PR #59 - Check status: <status>
[YYYY-MM-DD HH:MM:SS] VERIFICATION: Repo - Testing workflow <name> on main
[YYYY-MM-DD HH:MM:SS] VERIFICATION: Repo - Result: <pass/fail>
```

## 5. Completion Flag

After successful verification:

```bash
echo "Verification completed at $(date -Iseconds)" > plans/verification_complete.flag
echo "PR #59 status: <status>" >> plans/verification_complete.flag
echo "Repository workflows: <summary>" >> plans/verification_complete.flag
```

## 6. Rollback Verification

If fixes fail verification:

1. Rollback changes per `fix_strategy.md`
2. Verify rollback succeeded:
   ```bash
   gh pr checks 59  # Should return to previous state
   ```
3. Document failure in `plans/execution_log.md`
4. Regenerate patches with corrected approach

## 7. Final Checks Before Cleanup

- [ ] `gh pr checks 59` shows acceptable state
- [ ] All critical/high issues resolved
- [ ] `plans/verification_complete.flag` exists
- [ ] `plans/execution_log.md` is complete
- [ ] No temporary files outside `plans/`

## 8. Output Artifacts

- `plans/verification_complete.flag` - Completion marker
- `plans/execution_log.md` - Full verification log
- Updated `plans/repository_workflows_inventory.json` - Post-fix metrics
