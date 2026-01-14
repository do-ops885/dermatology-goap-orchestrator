# Contributing & Developer Workflow

Thanks for helping improve the project — we follow a lightweight, fast local workflow with CI enforcement.

## Local setup

1. npm install
2. npm run prepare # installs Husky git hooks
3. npm run format # optional: format the repo before submitting

## Pre-commit checks (what runs locally)

- Staged files are run through `lint-staged` (ESLint + Prettier).
- A lightweight secrets heuristic scans staged files for obvious secrets.
- A TypeScript typecheck runs by default (set `SKIP_TYPECHECK=1` to skip locally).
- To run an optional quick unit test pass-in `RUN_UNIT_TESTS=1`.

Example:

SKIP_TYPECHECK=1 RUN_UNIT_TESTS=1 git commit -m "fix: example"

> NOTE: Avoid routinely bypassing pre-commit hooks. Use `--no-verify` or bypass env variables only in emergencies and always follow up with a proper fix.

## How to bypass hooks (emergency only)

- To skip all hooks: `git commit --no-verify -m "..."` (not recommended)
- To skip only typecheck: `SKIP_TYPECHECK=1 git commit -m "..."`

## CI checks

- GitHub Actions CI runs on push & pull requests and includes:
  - Prettier check
  - ESLint
  - TypeScript typecheck
  - Unit tests with coverage
  - Secret scanning via Gitleaks (fail on detection)

If the secret scanner flags something, do NOT commit secrets. Revoke and rotate credentials if necessary and provide a sanitized commit.

> Recommendation: Protect the `main` branch using GitHub Branch Protection rules and require the **CI** workflow and the **secret_scan** job to pass before merging. This ensures secrets or failing checks cannot be merged without review.

### Apply branch protection automatically

We provide a helper script `scripts/apply-branch-protection.sh` and a manual GitHub Action to apply branch-protection rules.

- To run locally (requires `gh` CLI or `GITHUB_TOKEN`):

  ```bash
  # with gh (recommended)
  ./scripts/apply-branch-protection.sh do-ops885/dermatology-goap-orchestrator main

  # or with GITHUB_TOKEN
  GITHUB_TOKEN=<token> ./scripts/apply-branch-protection.sh do-ops885/dermatology-goap-orchestrator main
  ```

- To apply from GitHub UI: go to the Actions tab → **Apply Branch Protection** → Run workflow, and optionally set environment variables `BRANCH` and `CONTEXTS`.

- To enforce repository settings across forks or multiple repos (org admins): use the **Enforce Repository Settings** workflow (Actions → Enforce Repository Settings → Run workflow). It reads `.github/repository-settings.yml` and applies defaults + branch protections. This workflow is scheduled weekly and can be triggered manually.

> Note: running these requires repository admin permissions (or a token with `contents:write` and `administration:write` permissions). Ensure `GITHUB_TOKEN` used by Actions has the required scopes (org admins may use a PAT stored in a repo secret for cross-repo enforcement).

## Commit message conventions

We use Conventional Commits. Commit messages are validated by `commitlint`. Example:

feat(lesion-detection): add new threshold calibration

Run locally:

npx --no-install commitlint --from=HEAD~5 --to=HEAD

## Helpful scripts

- `npm run format` — format the whole repo
- `npm run lint` — run full ESLint
- `npm run typecheck` — run TypeScript checks
- `npm run test` — run test suite
- `npm run ci` — run the full set of checks locally (same as CI)

Thanks — please keep changes small and include tests where appropriate.
