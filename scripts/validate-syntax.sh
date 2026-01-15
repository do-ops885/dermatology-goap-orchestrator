#!/usr/bin/env bash
# Syntax Validation Script - Runs TypeScript compiler on files to catch syntax errors
# This catches syntax errors before prettier/formatting tools run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
FILES_ARG=""
CHECK_ALL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --all)
      CHECK_ALL=true
      shift
      ;;
    --files)
      FILES_ARG="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: ./scripts/validate-syntax.sh [--all] [--files \"file1.ts file2.ts\"]"
      echo "  --all     Check all TypeScript files in project"
      echo "  --files   Check specific files (space-separated)"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}Checking TypeScript syntax...${NC}"

# Get files to check
TS_FILES=""

if [ "$CHECK_ALL" = "true" ]; then
  echo -e "${BLUE}Checking all TypeScript files...${NC}"
  TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | grep -v ".next" | grep -v "dist" | tr '\n' ' ')
elif [ -n "$FILES_ARG" ]; then
  TS_FILES="$FILES_ARG"
else
  echo -e "${BLUE}Checking staged TypeScript files...${NC}"
  STAGED_TS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$' || true)
  
  if [ -z "$STAGED_TS_FILES" ]; then
    echo -e "${YELLOW}No TypeScript/JavaScript files staged for commit${NC}"
    exit 0
  fi
  TS_FILES=$(echo "$STAGED_TS_FILES" | tr '\n' ' ')
fi

if [ -z "$TS_FILES" ]; then
  echo -e "${YELLOW}No TypeScript/JavaScript files found${NC}"
  exit 0
fi

# Run TypeScript compiler to check for syntax errors
# Using --noEmit to check without generating output files
if npx tsc --noEmit $TS_FILES 2>&1; then
  echo -e "${GREEN}✓ Syntax validation passed${NC}"
  exit 0
else
  echo -e "${RED}✗ Syntax errors found${NC}"
  exit 1
fi
