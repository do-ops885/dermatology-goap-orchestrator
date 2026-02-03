#!/bin/bash

# Performance Testing Script
# Tests all performance optimizations implemented in Phase 2
#
# Usage: ./scripts/test-performance.sh

set -e

echo "🚀 Dermatology AI - Performance Testing Suite"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper function for test results
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((WARNINGS++))
}

echo "Step 1: Building production bundle..."
echo "======================================="
npm run build

if [ $? -eq 0 ]; then
    pass "Production build completed successfully"
else
    fail "Production build failed"
    exit 1
fi
echo ""

echo "Step 2: Analyzing bundle size..."
echo "================================="

# Check if dist directory exists
if [ ! -d "dist" ]; then
    fail "dist directory not found"
    exit 1
fi

# Get main bundle size
MAIN_BUNDLE=$(find dist/assets -name 'index-*.js' -exec du -k {} \; | awk '{print $1}')
MAIN_BUNDLE_KB=$MAIN_BUNDLE

echo "Main bundle: ${MAIN_BUNDLE_KB} KB"

# Check against budget (500 KB)
if [ "$MAIN_BUNDLE_KB" -lt 500 ]; then
    pass "Main bundle within budget (${MAIN_BUNDLE_KB} KB < 500 KB)"
elif [ "$MAIN_BUNDLE_KB" -lt 600 ]; then
    warn "Main bundle slightly over budget (${MAIN_BUNDLE_KB} KB)"
else
    fail "Main bundle exceeds budget (${MAIN_BUNDLE_KB} KB > 500 KB)"
fi

# Get vendor bundle sizes
VENDOR_TOTAL=0
echo ""
echo "Vendor bundles:"
for file in dist/assets/vendor-*.js; do
    if [ -f "$file" ]; then
        SIZE=$(du -k "$file" | awk '{print $1}')
        VENDOR_TOTAL=$((VENDOR_TOTAL + SIZE))
        echo "  - $(basename "$file"): ${SIZE} KB"
    fi
done

echo "Total vendor: ${VENDOR_TOTAL} KB"

# Check total size
TOTAL_SIZE=$((MAIN_BUNDLE_KB + VENDOR_TOTAL))
echo "Total bundle: ${TOTAL_SIZE} KB"

if [ "$TOTAL_SIZE" -lt 4000 ]; then
    pass "Total bundle within budget (${TOTAL_SIZE} KB < 4000 KB)"
else
    fail "Total bundle exceeds budget (${TOTAL_SIZE} KB > 4000 KB)"
fi

echo ""

echo "Step 3: Checking lazy-loaded chunks..."
echo "========================================"

# Count JavaScript chunks
CHUNK_COUNT=$(find dist/assets -name '*.js' | wc -l)
echo "Total JS chunks: $CHUNK_COUNT"

if [ "$CHUNK_COUNT" -ge 8 ]; then
    pass "Code splitting active (${CHUNK_COUNT} chunks)"
else
    warn "Expected more chunks from lazy loading (${CHUNK_COUNT} chunks)"
fi

# Check for specific lazy chunks
echo ""
echo "Checking for lazy-loaded components:"
for component in "AgentFlow" "DiagnosticSummary" "FairnessDashboard" "FairnessReport"; do
    # Look for chunk with component name pattern
    if find dist/assets -name "*.js" | xargs grep -l "$component" > /dev/null 2>&1; then
        echo "  ✓ $component chunk found"
    else
        echo "  ? $component chunk detection inconclusive"
    fi
done

echo ""

echo "Step 4: Testing build artifacts..."
echo "==================================="

# Check for source maps
if [ -f "dist/assets/index-*.js.map" ]; then
    pass "Source maps generated"
else
    warn "Source maps not found (may be disabled for production)"
fi

# Check for manifest
if [ -f "dist/manifest.json" ]; then
    pass "PWA manifest present"
else
    warn "PWA manifest not found"
fi

# Check for service worker
if [ -f "dist/sw.js" ]; then
    pass "Service worker present"
else
    warn "Service worker not found"
fi

echo ""

echo "Step 5: Starting preview server..."
echo "===================================="

# Start preview server in background
npm run preview > /tmp/preview.log 2>&1 &
PREVIEW_PID=$!

echo "Preview server started (PID: $PREVIEW_PID)"
echo "Waiting for server to be ready..."

# Wait for server to start
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:4173 > /dev/null 2>&1; then
        pass "Preview server ready"
        break
    fi
    sleep 1
    ((WAITED++))
done

if [ $WAITED -eq $MAX_WAIT ]; then
    fail "Preview server failed to start"
    kill $PREVIEW_PID 2>/dev/null || true
    exit 1
fi

echo ""

echo "Step 6: Running basic connectivity tests..."
echo "============================================="

# Test homepage
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4173)
if [ "$HTTP_STATUS" = "200" ]; then
    pass "Homepage accessible (HTTP $HTTP_STATUS)"
else
    fail "Homepage not accessible (HTTP $HTTP_STATUS)"
fi

# Test assets
MAIN_JS=$(find dist/assets -name 'index-*.js' | head -1 | xargs basename)
ASSET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4173/assets/$MAIN_JS")
if [ "$ASSET_STATUS" = "200" ]; then
    pass "Assets accessible (HTTP $ASSET_STATUS)"
else
    fail "Assets not accessible (HTTP $ASSET_STATUS)"
fi

echo ""

echo "Step 7: Performance metrics check..."
echo "======================================"

# Check if Lighthouse is installed
if ! command -v lighthouse &> /dev/null; then
    warn "Lighthouse not installed. Run: npm install -g @lhci/cli lighthouse"
    echo "Skipping Lighthouse audit..."
else
    echo "Running Lighthouse audit (this may take 30-60 seconds)..."
    
    lighthouse http://localhost:4173 \
        --only-categories=performance \
        --output=json \
        --output-path=/tmp/lighthouse-report.json \
        --quiet \
        --chrome-flags="--headless --no-sandbox" || true
    
    if [ -f "/tmp/lighthouse-report.json" ]; then
        PERF_SCORE=$(cat /tmp/lighthouse-report.json | grep -o '"performance":{"score":[0-9.]*' | grep -o '[0-9.]*$')
        PERF_SCORE_INT=$(echo "$PERF_SCORE * 100" | bc -l | cut -d. -f1)
        
        echo "Performance Score: $PERF_SCORE_INT/100"
        
        if [ "$PERF_SCORE_INT" -ge 90 ]; then
            pass "Lighthouse performance score: $PERF_SCORE_INT/100"
        elif [ "$PERF_SCORE_INT" -ge 70 ]; then
            warn "Lighthouse performance score: $PERF_SCORE_INT/100 (target: 90+)"
        else
            fail "Lighthouse performance score: $PERF_SCORE_INT/100 (target: 90+)"
        fi
        
        # Extract key metrics
        echo ""
        echo "Key metrics:"
        cat /tmp/lighthouse-report.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
audits = data.get('audits', {})
metrics = {
    'first-contentful-paint': 'FCP',
    'largest-contentful-paint': 'LCP',
    'total-blocking-time': 'TBT',
    'cumulative-layout-shift': 'CLS',
    'speed-index': 'Speed Index'
}
for key, label in metrics.items():
    if key in audits:
        value = audits[key].get('displayValue', 'N/A')
        print(f'  {label}: {value}')
" 2>/dev/null || echo "  (Could not parse metrics)"
    else
        warn "Lighthouse report not generated"
    fi
fi

echo ""

echo "Step 8: Cleanup..."
echo "=================="

# Kill preview server
kill $PREVIEW_PID 2>/dev/null || true
pass "Preview server stopped"

echo ""
echo "=============================================="
echo "Performance Testing Complete"
echo "=============================================="
echo ""
echo "Results:"
echo "  ✓ Passed:   $PASSED"
echo "  ✗ Failed:   $FAILED"
echo "  ⚠ Warnings: $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
elif [ $FAILED -le 2 ]; then
    echo -e "${YELLOW}Tests completed with some failures${NC}"
    exit 1
else
    echo -e "${RED}Multiple test failures detected${NC}"
    exit 1
fi
