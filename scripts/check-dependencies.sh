#!/usr/bin/env bash
# Check for peer dependency conflicts before commit
# This prevents pushing code with broken dependency resolution

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}          🔍 DEPENDENCY RESOLUTION CHECK${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if package-lock.json exists
if [ ! -f "package-lock.json" ]; then
  echo -e "${YELLOW}⚠ No package-lock.json found. Run 'npm install' first.${NC}"
  exit 1
fi

echo "Checking for peer dependency conflicts..."

# Check npm install --dry-run for ERESOLVE errors
# We run this with --ignore-scripts to avoid executing install scripts
if npm install --dry-run --ignore-scripts 2>&1 | grep -q "ERESOLVE"; then
  echo -e "${RED}✗ Dependency conflicts detected!${NC}"
  echo ""
  echo -e "${YELLOW}Running full npm install to show details...${NC}"
  echo ""
  npm install --dry-run --ignore-scripts || true
  echo ""
  echo -e "${RED}Please fix the dependency conflicts before committing.${NC}"
  echo -e "${YELLOW}Try running 'npm install' to see full error details.${NC}"
  exit 1
fi

# Additional check: verify package-lock.json is up to date
if ! npm ci --dry-run > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠ package-lock.json may be out of sync with package.json${NC}"
  echo -e "${YELLOW}Run 'npm install' to update package-lock.json${NC}"
  exit 1
fi

echo -e "${GREEN}✓ No peer dependency conflicts detected${NC}"
echo -e "${GREEN}✓ package-lock.json is in sync with package.json${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
exit 0
