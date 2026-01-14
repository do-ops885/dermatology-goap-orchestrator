#!/usr/bin/env bash
# Validation Script: Verify GitHub Actions workflow syntax and configuration
# Usage: ./scripts/validate-workflows.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WORKFLOW_DIR=".github/workflows"
FAILURES=0
TOTAL_CHECKS=0

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}          🔄 WORKFLOW VALIDATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if workflow directory exists
if [ ! -d "$WORKFLOW_DIR" ]; then
    echo -e "${RED}✗ FAIL: Workflow directory not found: $WORKFLOW_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}Found workflow directory: $WORKFLOW_DIR${NC}"
echo ""

# Get all workflow files
WORKFLOW_FILES=("$WORKFLOW_DIR"/*.yml "$WORKFLOW_DIR"/*.yaml)

if [ ${#WORKFLOW_FILES[@]} -eq 0 ]; then
    echo -e "${YELLOW}⚠ WARNING: No workflow files found${NC}"
    exit 0
fi

# Validate each workflow
for workflow in "${WORKFLOW_FILES[@]}"; do
    if [ ! -f "$workflow" ]; then
        continue
    fi

    WORKFLOW_NAME=$(basename "$workflow")
    echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
    echo -e "${BLUE}Validating: $WORKFLOW_NAME${NC}"
    echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"

    # Check 1: YAML syntax
    echo -e "${BLUE}  [1/5] YAML syntax...${NC}"
    ((TOTAL_CHECKS++))
    if python3 -c "import yaml; yaml.safe_load(open('$workflow'))" 2>/dev/null; then
        echo -e "    ${GREEN}✓ Valid YAML${NC}"
    else
        echo -e "    ${RED}✗ Invalid YAML${NC}"
        ((FAILURES++))
    fi

    # Check 2: Required top-level keys
    echo -e "${BLUE}  [2/5] Required keys...${NC}"
    ((TOTAL_CHECKS++))
    if python3 -c "
import yaml
wf = yaml.safe_load(open('$workflow'))
required = ['name', 'on', 'jobs']
for key in required:
    if key not in wf:
        raise ValueError(f'Missing key: {key}')
" 2>/dev/null; then
        echo -e "    ${GREEN}✓ All required keys present${NC}"
    else
        echo -e "    ${RED}✗ Missing required keys${NC}"
        ((FAILURES++))
    fi

    # Check 3: Permissions section
    echo -e "${BLUE}  [3/5] Permissions...${NC}"
    ((TOTAL_CHECKS++))
    if python3 -c "import yaml; yaml.safe_load(open('$workflow')).get('permissions')" 2>/dev/null; then
        echo -e "    ${GREEN}✓ Permissions defined${NC}"
    else
        echo -e "    ${YELLOW}⚠ No permissions section (using default)${NC}"
    fi

    # Check 4: Node.js version consistency
    echo -e "${BLUE}  [4/5] Node.js version...${NC}"
    ((TOTAL_CHECKS++))
    if grep -q "node-version: ['\"]20['\"]" "$workflow"; then
        echo -e "    ${GREEN}✓ Node.js 20 specified${NC}"
    else
        echo -e "    ${YELLOW}⚠ Node.js 20 not found (may use different version)${NC}"
    fi

    # Check 5: npm cache configuration
    echo -e "${BLUE}  [5/5] npm cache...${NC}"
    ((TOTAL_CHECKS++))
    if grep -q "cache: ['\"]npm['\"]" "$workflow"; then
        echo -e "    ${GREEN}✓ npm cache enabled${NC}"
    else
        echo -e "    ${YELLOW}⚠ npm cache not enabled${NC}"
    fi

    echo ""
done

# Specific workflow checks
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}Workflow-Specific Checks${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
echo ""

# Check CI workflow
if [ -f "$WORKFLOW_DIR/ci.yml" ]; then
    echo -e "${BLUE}CI workflow checks:${NC}"
    
    # Check for npm ci
    ((TOTAL_CHECKS++))
    if grep -q "npm ci" "$WORKFLOW_DIR/ci.yml"; then
        echo -e "  ${GREEN}✓ Uses npm ci${NC}"
    else
        echo -e "  ${RED}✗ Does not use npm ci${NC}"
        ((FAILURES++))
    fi
    
    # Check for fallback
    ((TOTAL_CHECKS++))
    if grep -q "npm ci.*legacy-peer-deps" "$WORKFLOW_DIR/ci.yml"; then
        echo -e "  ${GREEN}✓ Has fallback to --legacy-peer-deps${NC}"
    else
        echo -e "  ${YELLOW}⚠ No --legacy-peer-deps fallback${NC}"
    fi
    echo ""
fi

# Check Dependabot auto-merge workflow
if [ -f "$WORKFLOW_DIR/auto-merge-dependabot.yml" ]; then
    echo -e "${BLUE}Dependabot auto-merge checks:${NC}"
    
    # Check for Dependabot actor check
    ((TOTAL_CHECKS++))
    if grep -q "dependabot\[bot\]" "$WORKFLOW_DIR/auto-merge-dependabot.yml"; then
        echo -e "  ${GREEN}✓ Checks for Dependabot bot actor${NC}"
    else
        echo -e "  ${RED}✗ Does not check for Dependabot bot${NC}"
        ((FAILURES++))
    fi
    
    # Check permissions
    ((TOTAL_CHECKS++))
    if grep -q "pull-requests: write" "$WORKFLOW_DIR/auto-merge-dependabot.yml"; then
        echo -e "  ${GREEN}✓ Has pull-requests: write permission${NC}"
    else
        echo -e "  ${RED}✗ Missing pull-requests: write permission${NC}"
        ((FAILURES++))
    fi
    echo ""
fi

# Check lockfile maintenance workflow
if [ -f "$WORKFLOW_DIR/lockfile-maintenance.yml" ]; then
    echo -e "${BLUE}Lockfile maintenance checks:${NC}"
    
    # Check for npm update
    ((TOTAL_CHECKS++))
    if grep -q "npm update" "$WORKFLOW_DIR/lockfile-maintenance.yml"; then
        echo -e "  ${GREEN}✓ Uses npm update${NC}"
    else
        echo -e "  ${RED}✗ Does not use npm update${NC}"
        ((FAILURES++))
    fi
    
    # Check for PR creation
    ((TOTAL_CHECKS++))
    if grep -q "peter-evans/create-pull-request" "$WORKFLOW_DIR/lockfile-maintenance.yml"; then
        echo -e "  ${GREEN}✓ Creates pull request${NC}"
    else
        echo -e "  ${YELLOW}⚠ PR creation action not found${NC}"
    fi
    echo ""
fi

# Final summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Summary: $TOTAL_CHECKS checks completed${NC}"
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ WORKFLOW VALIDATION PASSED${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "${RED}❌ WORKFLOW VALIDATION FAILED - $FAILURES check(s) failed${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    exit 1
fi
