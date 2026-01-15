#!/usr/bin/env sh
# Quick, heuristic secret scanning of staged files. Not a replacement for full secret scanner in CI.
# Exits non-zero if any suspicious pattern is found.

set -e

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
[ -n "$STAGED_FILES" ] || exit 0

FAIL=0
PATTERNS='(password|passwd|secret|api[_-]?key|aws[_-]?secret|aws[_-]?access|private[_-]?key|BEGIN( RSA| DSA| PRIVATE) KEY|-----BEGINPRIVATEKEY-----|client_secret)'

for file in $STAGED_FILES; do
  # skip the secrets script, pre-commit hook, and quality-gate.sh (false positives)
  case "$file" in
    *pre-commit-secrets.sh|*.husky/pre-commit|*quality-gate.sh) continue ;;
  esac

  # only scan text files
  if [ -f "$file" ] && file --brief --mime "$file" | grep -qi 'text\|json\|xml\|javascript\|typescript\|application/json'; then
    if grep -nE "$PATTERNS" "$file" >/dev/null 2>&1; then
      echo "Potential secret in $file"
      grep -nE "$PATTERNS" "$file" || true
      FAIL=1
    fi

    # detect long base64-ish strings which often indicate keys
    if grep -nE "[A-Za-z0-9+/]{40,}={0,2}" "$file" >/dev/null 2>&1; then
      echo "Potential long base64 string in $file"
      grep -nE "[A-Za-z0-9+/]{40,}={0,2}" "$file" || true
      FAIL=1
    fi
  fi
done

if [ $FAIL -ne 0 ]; then
  echo "
Detected potential secrets in staged files. Abort commit. If this is a false positive, review and stage a sanitized version."
  exit 1
fi

exit 0
