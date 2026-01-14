#!/usr/bin/env bash
# Check max lines of code (500 LOC) per file as per AGENTS.md

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

MAX_LOC=500
VIOLATIONS=0

echo "Checking for files exceeding $MAX_LOC LOC..."

# Find TypeScript and JavaScript files (excluding node_modules, dist, .git)
FILES=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  ! -path "./node_modules/*" \
  ! -path "./dist/*" \
  ! -path "./.git/*" \
  ! -path "./.next/*" \
  ! -path "./coverage/*" \
  ! -path "./scripts/*" \
  ! -path "*/node_modules/*")

for file in $FILES; do
  if [ -f "$file" ]; then
    LOC=$(wc -l < "$file" | tr -d ' ')
    
    if [ "$LOC" -gt "$MAX_LOC" ]; then
      echo -e "${RED}✗ $file: $LOC lines (exceeds $MAX_LOC)${NC}"
      ((VIOLATIONS++))
    fi
  fi
done

if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}✓ All files within $MAX_LOC LOC limit${NC}"
  exit 0
else
  echo -e "${RED}Found $VIOLATIONS file(s) exceeding $MAX_LOC LOC${NC}"
  echo -e "${YELLOW}Please refactor large files according to AGENTS.md${NC}"
  exit 1
fi
