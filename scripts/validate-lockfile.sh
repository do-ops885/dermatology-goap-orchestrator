#!/usr/bin/env bash
# Validation Script: Verify package-lock.json exists and is valid
# Usage: ./scripts/validate-lockfile.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

LOCKFILE="package-lock.json"
PACKAGE_JSON="package.json"
FAILURES=0

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}          🔒 LOCKFILE VALIDATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Test 1: Check if lockfile exists
echo -e "${BLUE}[1/5] Checking lockfile existence...${NC}"
if [ ! -f "$LOCKFILE" ]; then
    echo -e "${RED}✗ FAIL: $LOCKFILE not found${NC}"
    echo -e "${YELLOW}  Run 'npm install' to generate lockfile${NC}"
    ((FAILURES++))
else
    echo -e "${GREEN}✓ PASS: $LOCKFILE exists${NC}"
fi
echo ""

# Test 2: Validate JSON syntax
echo -e "${BLUE}[2/5] Validating JSON syntax...${NC}"
if [ ! -f "$LOCKFILE" ]; then
    echo -e "${YELLOW}⊘ SKIP: Lockfile does not exist${NC}"
else
    if node -e "JSON.parse(require('fs').readFileSync('$LOCKFILE', 'utf8'))" 2>/dev/null; then
        echo -e "${GREEN}✓ PASS: Valid JSON${NC}"
    else
        echo -e "${RED}✗ FAIL: Invalid JSON in $LOCKFILE${NC}"
        ((FAILURES++))
    fi
fi
echo ""

# Test 3: Verify lockfile matches package.json
echo -e "${BLUE}[3/5] Checking sync with package.json...${NC}"
if [ ! -f "$LOCKFILE" ] || [ ! -f "$PACKAGE_JSON" ]; then
    echo -e "${YELLOW}⊘ SKIP: One or both files missing${NC}"
else
    if npm ci --dry-run > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS: Lockfile in sync with package.json${NC}"
    else
        echo -e "${RED}✗ FAIL: Lockfile out of sync with package.json${NC}"
        echo -e "${YELLOW}  Run 'npm install' to resync${NC}"
        ((FAILURES++))
    fi
fi
echo ""

# Test 4: Check lockfile integrity
echo -e "${BLUE}[4/5] Verifying lockfile integrity...${NC}"
if [ ! -f "$LOCKFILE" ]; then
    echo -e "${YELLOW}⊘ SKIP: Lockfile does not exist${NC}"
else
    # Check if lockfile has essential fields
    if node -e "
        const lockfile = JSON.parse(require('fs').readFileSync('$LOCKFILE', 'utf8'));
        if (!lockfile.lockfileVersion) throw new Error('Missing lockfileVersion');
        if (!lockfile.packages) throw new Error('Missing packages');
    " 2>/dev/null; then
        echo -e "${GREEN}✓ PASS: Lockfile structure valid${NC}"
    else
        echo -e "${RED}✗ FAIL: Lockfile structure invalid${NC}"
        ((FAILURES++))
    fi
fi
echo ""

# Test 5: Verify lockfile in .gitignore
echo -e "${BLUE}[5/5] Checking .gitignore...${NC}"
if [ ! -f ".gitignore" ]; then
    echo -e "${YELLOW}⚠ WARNING: No .gitignore file found${NC}"
else
    if grep -q "^package-lock.json$" .gitignore; then
        echo -e "${YELLOW}⚠ WARNING: package-lock.json is in .gitignore${NC}"
        echo -e "${YELLOW}  This may prevent lockfile from being committed${NC}"
    else
        echo -e "${GREEN}✓ PASS: package-lock.json not in .gitignore${NC}"
    fi
fi
echo ""

# Final summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ LOCKFILE VALIDATION PASSED${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "${RED}❌ LOCKFILE VALIDATION FAILED - $FAILURES check(s) failed${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    exit 1
fi
