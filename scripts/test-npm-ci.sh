#!/usr/bin/env bash
# Test Script: Validate npm ci behavior in different scenarios
# Usage: ./scripts/test-npm-ci.sh [scenario]
#   clean     - Test fresh install (default)
#   cached    - Test cache performance
#   legacy    - Test --legacy-peer-deps fallback
#   all       - Run all scenarios

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCENARIO="${1:-clean}"
NODE_MODULES_BACKUP="node_modules.backup"
FAILURES=0

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}          📦 NPM CI VALIDATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Function to backup and clean
backup_and_clean() {
    if [ -d "node_modules" ]; then
        echo -e "${BLUE}Backing up node_modules...${NC}"
        mv node_modules "$NODE_MODULES_BACKUP" 2>/dev/null || true
    fi
}

# Function to restore
restore_node_modules() {
    if [ -d "$NODE_MODULES_BACKUP" ]; then
        echo -e "${BLUE}Restoring node_modules...${NC}"
        rm -rf node_modules 2>/dev/null || true
        mv "$NODE_MODULES_BACKUP" node_modules
    fi
}

# Cleanup on exit
cleanup() {
    restore_node_modules
}
trap cleanup EXIT

# Scenario: Clean install
test_clean() {
    echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
    echo -e "${BLUE}Scenario: Clean Install${NC}"
    echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
    echo ""

    backup_and_clean

    # Test 1: npm ci succeeds
    echo -e "${BLUE}[1/3] Testing npm ci...${NC}"
    START=$(date +%s)
    if npm ci; then
        END=$(date +%s)
        DURATION=$((END - START))
        echo -e "${GREEN}✓ npm ci succeeded (took ${DURATION}s)${NC}"
    else
        echo -e "${RED}✗ npm ci failed${NC}"
        ((FAILURES++))
        
        # Test fallback
        echo -e "${BLUE}[2/3] Trying npm ci --legacy-peer-deps...${NC}"
        START=$(date +%s)
        if npm ci --legacy-peer-deps; then
            END=$(date +%s)
            DURATION=$((END - START))
            echo -e "${GREEN}✓ npm ci --legacy-peer-deps succeeded (took ${DURATION}s)${NC}"
        else
            echo -e "${RED}✗ npm ci --legacy-peer-deps also failed${NC}"
            ((FAILURES++))
        fi
    fi
    echo ""

    # Test 3: Verify node_modules created
    echo -e "${BLUE}[3/3] Verifying node_modules created...${NC}"
    if [ -d "node_modules" ] && [ "$(ls -A node_modules)" ]; then
        FILE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
        echo -e "${GREEN}✓ node_modules created (${FILE_COUNT} packages)${NC}"
    else
        echo -e "${RED}✗ node_modules not created or empty${NC}"
        ((FAILURES++))
    fi
    echo ""
}

# Scenario: Cache performance
test_cached() {
    echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
    echo -e "${BLUE}Scenario: Cache Performance${NC}"
    echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
    echo ""

    # First run (cold)
    echo -e "${BLUE}[1/2] Cold run (no cache)...${NC}"
    backup_and_clean
    rm -rf ~/.npm/_cacache/index-v5 2>/dev/null || true
    START=$(date +%s)
    if npm ci; then
        END=$(date +%s)
        COLD_TIME=$((END - START))
        echo -e "${GREEN}✓ Cold run completed in ${COLD_TIME}s${NC}"
    else
        echo -e "${RED}✗ Cold run failed${NC}"
        ((FAILURES++))
    fi
    echo ""

    # Second run (warm)
    echo -e "${BLUE}[2/2] Warm run (with cache)...${NC}"
    backup_and_clean
    START=$(date +%s)
    if npm ci; then
        END=$(date +%s)
        WARM_TIME=$((END - START))
        echo -e "${GREEN}✓ Warm run completed in ${WARM_TIME}s${NC}"
        
        # Calculate improvement
        if [ $COLD_TIME -gt 0 ] && [ $WARM_TIME -lt $COLD_TIME ]; then
            IMPROVEMENT=$(( (COLD_TIME - WARM_TIME) * 100 / COLD_TIME ))
            echo -e "${GREEN}✓ Cache improved performance by ${IMPROVEMENT}%${NC}"
        fi
    else
        echo -e "${RED}✗ Warm run failed${NC}"
        ((FAILURES++))
    fi
    echo ""
}

# Scenario: Legacy peer deps
test_legacy() {
    echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
    echo -e "${BLUE}Scenario: Legacy Peer Deps${NC}"
    echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
    echo ""

    backup_and_clean

    # Test standard npm ci
    echo -e "${BLUE}[1/2] Testing standard npm ci...${NC}"
    if npm ci; then
        echo -e "${GREEN}✓ npm ci succeeded without --legacy-peer-deps${NC}"
    else
        echo -e "${YELLOW}⚠ npm ci failed (expected with peer conflicts)${NC}"
        
        # Test with flag
        echo -e "${BLUE}[2/2] Testing npm ci --legacy-peer-deps...${NC}"
        if npm ci --legacy-peer-deps; then
            echo -e "${GREEN}✓ npm ci --legacy-peer-deps succeeded${NC}"
        else
            echo -e "${RED}✗ npm ci --legacy-peer-deps failed${NC}"
            ((FAILURES++))
        fi
    fi
    echo ""
}

# Scenario: Lockfile integrity
test_integrity() {
    echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
    echo -e "${BLUE}Scenario: Lockfile Integrity${NC}"
    echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
    echo ""

    # Test 1: Valid lockfile
    echo -e "${BLUE}[1/2] Testing with valid lockfile...${NC}"
    if npm ci --dry-run > /dev/null 2>&1; then
        echo -e "${GREEN}✓ package-lock.json is valid${NC}"
    else
        echo -e "${RED}✗ package-lock.json validation failed${NC}"
        ((FAILURES++))
    fi
    echo ""

    # Test 2: Corrupted lockfile
    echo -e "${BLUE}[2/2] Testing corrupted lockfile detection...${NC}"
    if [ -f "package-lock.json" ]; then
        # Backup original
        cp package-lock.json package-lock.json.backup
        
        # Corrupt it
        echo "{ invalid json" > package-lock.json
        
        if npm ci --dry-run > /dev/null 2>&1; then
            echo -e "${RED}✗ Corrupted lockfile not detected${NC}"
            ((FAILURES++))
        else
            echo -e "${GREEN}✓ Corrupted lockfile detected correctly${NC}"
        fi
        
        # Restore
        mv package-lock.json.backup package-lock.json
    else
        echo -e "${YELLOW}⊘ SKIP: No package-lock.json to test${NC}"
    fi
    echo ""
}

# Run scenarios
case "$SCENARIO" in
    clean)
        test_clean
        ;;
    cached)
        test_cached
        ;;
    legacy)
        test_legacy
        ;;
    integrity)
        test_integrity
        ;;
    all)
        test_clean
        test_cached
        test_legacy
        test_integrity
        ;;
    *)
        echo -e "${RED}Unknown scenario: $SCENARIO${NC}"
        echo "Usage: $0 [clean|cached|legacy|integrity|all]"
        exit 1
        ;;
esac

# Final summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ NPM CI VALIDATION PASSED ($SCENARIO scenario)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "${RED}❌ NPM CI VALIDATION FAILED - $FAILURES check(s) failed${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    exit 1
fi
