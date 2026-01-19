#!/usr/bin/env sh
# Quick, heuristic secret scanning of staged files. Not a replacement for full secret scanner in CI.
# Exits non-zero if any suspicious pattern is found.

set -e

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
[ -n "$STAGED_FILES" ] || exit 0

FAIL=0
PATTERNS='(password|passwd|secret|api[_-]?key|aws[_-]?secret|aws[_-]?access|private[_-]?key|BEGIN( RSA| DSA| PRIVATE) KEY|-----BEGINPRIVATEKEY-----|client_secret)'

# Patterns that should be ignored (false positives for workflow/job names, comments, etc.)
IGNORE_PATTERNS='secret_scan|Gitleaks|gitleaks|secret.*scan'

for file in $STAGED_FILES; do
  # skip test files, documentation files, and script files (false positives)
  case "$file" in
    *pre-commit-secrets.sh|*.husky/pre-commit|*quality-gate.sh|*.spec.ts|*.test.ts|*.md|playwright-report/*) continue ;;
  esac

  # only scan text files
  if [ -f "$file" ] && file --brief --mime "$file" | grep -qi 'text\|json\|xml\|javascript\|typescript\|application/json'; then
    # Check for keywords, but skip GitHub Actions secret syntax which is safe by design
    # GitHub Actions uses ${{ secrets.* }} which is properly masked and never exposed
    if grep -nE "$PATTERNS" "$file" >/dev/null 2>&1; then
      # Filter out GitHub Actions secret references and workflow job names/comments
      # ${{ secrets.TOKEN_NAME }} is GitHub's secure secret injection mechanism
      # Also ignore job names like "secret_scan" and tool references like "Gitleaks"
      if grep -nE "$PATTERNS" "$file" |
         grep -v '\${{ secrets\.' |
         grep -vE "$IGNORE_PATTERNS" >/dev/null 2>&1; then
        echo "Potential secret in $file"
        grep -nE "$PATTERNS" "$file" |
          grep -v '\${{ secrets\.' |
          grep -vE "$IGNORE_PATTERNS" || true
        FAIL=1
      fi
    fi

    # detect long base64-ish strings which often indicate keys (skip documentation files)
    # Also skip zero-hash placeholders used for testing (64 hex zeros = common SHA-256 empty hash)
    if echo "$file" | grep -qv '\.md' && grep -nE "[A-Za-z0-9+/]{40,}={0,2}" "$file" >/dev/null 2>&1; then
      # Skip lines with GitHub Actions secret syntax or zero-hash test placeholders
      if grep -nE "[A-Za-z0-9+/]{40,}={0,2}" "$file" |
         grep -v '\${{ secrets\.' |
         grep -v "0000000000000000000000000000000000000000000000000000000000000000" >/dev/null 2>&1; then
        echo "Potential long base64 string in $file"
        grep -nE "[A-Za-z0-9+/]{40,}={0,2}" "$file" |
          grep -v '\${{ secrets\.' |
          grep -v "0000000000000000000000000000000000000000000000000000000000000000" || true
        FAIL=1
      fi
    fi
  fi
done

if [ $FAIL -ne 0 ]; then
  echo "
Detected potential secrets in staged files. Abort commit. If this is a false positive, review and stage a sanitized version."
  exit 1
fi

exit 0
