#!/usr/bin/env bash
# Quality Gate Script - Runs comprehensive code quality checks
# Usage: ./scripts/quality-gate.sh [options]
#   --skip-tests     Skip running tests
#   --skip-coverage  Skip coverage check
#   --skip-build     Skip production build check
#   --fast           Fast mode (skip build, coverage, full test suite)
#   --fix            Auto-fix linting issues where possible
#   -h, --help       Show this help message

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default flags
SKIP_TESTS=false
SKIP_COVERAGE=true  # Coverage not configured by default
SKIP_BUILD=true      # Build check optional by default
AUTO_FIX=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --skip-coverage)
      SKIP_COVERAGE=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --fast)
      SKIP_TESTS=true
      SKIP_COVERAGE=true
      SKIP_BUILD=true
      shift
      ;;
    --fix)
      AUTO_FIX=true
      shift
      ;;
    -h|--help)
      echo "Usage: ./scripts/quality-gate.sh [options]"
      echo ""
      echo "Options:"
      echo "  --skip-tests     Skip running tests"
      echo "  --skip-coverage  Skip coverage check"
      echo "  --skip-build     Skip production build check"
      echo "  --fast           Fast mode (skip build, coverage, full test suite)"
      echo "  --fix            Auto-fix linting issues where possible"
      echo "  -h, --help       Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Track failures
FAILURES=0

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}          🚦 QUALITY GATE - Comprehensive Checks${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Function to run a check
run_check() {
  local name="$1"
  local command="$2"
  local critical="$3"  # true = must pass, false = warning only
  
  echo -e "${BLUE}▶ $name${NC}"
  
  if eval "$command"; then
    echo -e "${GREEN}✓ $name passed${NC}"
    return 0
  else
    if [ "$critical" = "true" ]; then
      echo -e "${RED}✗ $name failed${NC}"
      ((FAILURES++))
      return 1
    else
      echo -e "${YELLOW}⚠ $name failed (non-critical)${NC}"
      return 0
    fi
  fi
}

# 1. Prettier Check
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}📝 Formatting Check${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
if [ "$AUTO_FIX" = "true" ]; then
  run_check "Prettier (auto-fix)" "npm run format" "true"
else
  run_check "Prettier" "npm run prettier:check" "true"
fi
echo ""

# 2. ESLint Check
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}🔍 Linting Check${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
if [ "$AUTO_FIX" = "true" ]; then
  run_check "ESLint (auto-fix)" "npm run lint:fix" "true"
else
  run_check "ESLint" "npm run lint" "true"
fi
echo ""

# 3. TypeScript Type Check
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}🔷 Type Safety Check${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
if [ -z "$SKIP_TYPECHECK" ]; then
  run_check "TypeScript" "npm run typecheck" "true"
else
  echo -e "${YELLOW}⊘ TypeScript typecheck skipped (SKIP_TYPECHECK set)${NC}"
fi
echo ""

# 4. Secret Scan
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}🔐 Security Check${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
run_check "Secret detection" "sh ./scripts/pre-commit-secrets.sh" "true"
echo ""

# 5. Tests
if [ "$SKIP_TESTS" = "false" ]; then
  echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
  echo -e "${BLUE}🧪 Test Suite${NC}"
  echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
  run_check "Unit tests" "npm run test" "true"
  echo ""
else
  echo -e "${YELLOW}⊘ Tests skipped (use --skip-tests or --fast)${NC}"
  echo ""
fi

# 6. Build Check
if [ "$SKIP_BUILD" = "false" ]; then
  echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
  echo -e "${BLUE}🏗️  Production Build${NC}"
  echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
  run_check "Production build" "npm run build" "true"
  echo ""
else
  echo -e "${YELLOW}⊘ Build check skipped (use --skip-build or --fast)${NC}"
  echo ""
fi

# 7. Max LOC Check
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}📏 Code Size Check${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
run_check "Max LOC (500 lines)" "sh ./scripts/check-max-loc.sh" "false"
echo ""

# Final summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}✅ QUALITY GATE PASSED - All critical checks successful!${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  exit 0
else
  echo -e "${RED}❌ QUALITY GATE FAILED - $FAILURES critical check(s) failed${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${YELLOW}To auto-fix issues where possible:${NC}"
  echo "  ./scripts/quality-gate.sh --fix"
  echo ""
  echo -e "${YELLOW}To run checks manually:${NC}"
  echo "  npm run lint:fix      # Fix linting issues"
  echo "  npm run format        # Format code"
  echo "  npm run typecheck     # Check types"
  echo "  npm run test          # Run tests"
  exit 1
fi
