#!/usr/bin/env bash
set -eu -o pipefail

# apply-branch-protection.sh
# Usage:
#   ./scripts/apply-branch-protection.sh [owner/repo] [branch]
# Requires: gh CLI (preferred) or GITHUB_TOKEN env var (for curl fallback)

REPO_FULL=${1:-${REPO_FULL:-$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)}}
BRANCH=${2:-${BRANCH:-main}}
CONTEXTS=${CONTEXTS:-'["CI","secret_scan"]'}

if [ -z "$REPO_FULL" ]; then
  echo "Repository not provided and could not be inferred. Provide owner/repo as first arg or login with 'gh auth login'."
  exit 1
fi

echo "Setting branch protection for: $REPO_FULL branch: $BRANCH"

echo "Using contexts: $CONTEXTS"

# Try gh first (preferred)
if command -v gh >/dev/null 2>&1; then
  echo "Using gh CLI to apply protection..."
  # Build JSON payload for required_status_checks with contexts
  # gh api's -f doesn't allow direct nested JSON reliably across shells, so use a temp file
  payload=$(mktemp)
  cat > "$payload" <<JSON
{
  "required_status_checks": { "strict": true, "contexts": $CONTEXTS },
  "enforce_admins": true,
  "required_pull_request_reviews": { "dismiss_stale_reviews": true, "require_code_owner_reviews": false, "required_approving_review_count": 1 },
  "restrictions": null,
  "required_linear_history": { "enabled": true },
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON

  gh api --method PUT "/repos/$REPO_FULL/branches/$BRANCH/protection" -H "Content-Type: application/json" --input "$payload" >/dev/null && echo "Branch protection applied via gh CLI" || { echo "gh CLI failed to apply protection"; rm -f "$payload"; exit 1; }
  rm -f "$payload"
fi

# Fallback using GITHUB_TOKEN + curl
if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found; attempting REST API via GITHUB_TOKEN..."
  if [ -z "${GITHUB_TOKEN:-}" ]; then
    echo "GITHUB_TOKEN not set. Please set it or install gh and authenticate."
    exit 1
  fi

  api_url="https://api.github.com/repos/$REPO_FULL/branches/$BRANCH/protection"
  body=$(cat <<-JSON
  {
    "required_status_checks": { "strict": true, "contexts": $CONTEXTS },
    "enforce_admins": true,
    "required_pull_request_reviews": { "dismiss_stale_reviews": true, "require_code_owner_reviews": false, "required_approving_review_count": 1 },
    "restrictions": null,
    "required_linear_history": { "enabled": true },
    "allow_force_pushes": false,
    "allow_deletions": false
  }
  JSON
  )

  curl -sS -X PUT "$api_url" \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -d "$body" && echo "Branch protection applied via API" || { echo "Failed to apply branch protection via API"; exit 1; }
fi

echo "Done."