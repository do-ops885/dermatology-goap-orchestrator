---
description: Fix all pre-existing issues in all open PRs using multi-agent orchestration
agent: general
---

# Fix All Open PRs Command

Orchestrate multi-agent workflow to fix all pre-existing issues across all open pull requests.

## Workflow

Always follow this exact sequence:

### Phase 1: Analysis & Planning

1. **List all open PRs**:
   - Run `gh pr list --state open --json number,title,headRefName,url,author`
   - Capture each PR's details for coordination

2. **Create worktrees for each PR**:

   ```bash
   # For each PR, create worktree
   git worktree add ../pr-<number> origin/<branch-name>
   # Clean up old worktrees first: git worktree list && git worktree prune
   ```

3. **Create execution plan in @plans/**:
   - Generate file: `fix-all-prs-<date>.md`
   - Document:
     - List of all open PRs with their URLs and branches
     - Issues found in each PR (GH Actions, lint, typecheck, tests)
     - Skill assignments per PR (1-15 agents total)
     - Dependencies between PRs

4. **Research best practices**:
   - Use web-research agent for latest practices on any issue types encountered
   - Document findings in plan

### Phase 2: Agent Orchestration

For each open PR, spawn specialized agents (1-15 total across all PRs):

**Agent Groups**:

- **Testing Agent**: E2E tests, unit test failures
- **Build Agent**: Bundle size, webpack issues, Vite errors
- **DevOps Agent**: GitHub Actions workflows, CI/CD fixes
- **Goap-Architect**: GOAP system issues if present
- **Security-Audit**: Security vulnerabilities, CSP issues
- **Reliability-Architect**: Error boundaries, crash handling
- **Fairness-Audit**: TPR/FPR gaps, demographic bias
- **Jr-Dev Agent**: Straightforward coding fixes following patterns

**Agent Assignment Rules**:

- Start with PR closest to merge (fewest issues)
- Prioritize critical issues (security, tests, typecheck)
- Each agent gets clear task definition from plan
- Agents work in parallel where possible

### Phase 3: Fix Execution Loop

For each PR worktree:

1. **Navigate to worktree**:

   ```bash
   cd ../pr-<number>
   ```

2. **Run validation**:

   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```

3. **Fix issues using assigned agents**:
   - Invoke appropriate agent skill for each issue type
   - Agents create atomic commits following commit guidelines
   - Reference: @.opencode/command/commit.md for commit format

4. **Push fixes**:

   ```bash
   git push
   ```

5. **Verify GH Actions pass**:

   ```bash
   gh run watch --exit-status
   ```

6. **Loop until all checks pass**:
   - If GH Actions fail: Analyze failure → Apply fix → Push → Watch again
   - Document each iteration in plan file

### Phase 4: Cleanup & Summary

1. **Cleanup worktrees**:

   ```bash
   git worktree remove ../pr-1
   git worktree remove ../pr-2
   # ... for all worktrees
   ```

2. **Generate summary**:
   - Update plan file with final status
   - List all commits made per PR
   - Document any remaining issues or blockers
   - Provide merge readiness assessment per PR

## Key Principles

- **Atomic commits**: Each fix in its own commit with proper message
- **No bypasses**: Never use `--no-verify` or bypass validation
- **Parallel work**: Use worktrees to work on multiple PRs simultaneously
- **Documentation**: Update plan file throughout execution
- **Best practices**: Consult latest practices via web-research when uncertain
- **Loop until green**: Keep fixing until all GH Actions pass

## Output Expectations

Provide:

- Plan file location (@plans/fix-all-prs-\*.md)
- Summary of PRs fixed with commit hashes
- Any PRs with remaining blockers requiring manual review
- GH Actions status for each PR

$ARGUMENTS
