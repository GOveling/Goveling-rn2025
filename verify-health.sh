#!/bin/bash

# 🔍 Quick Verification Script - Post Modernization
# Run this script to quickly verify the health of the codebase

echo "🔍 Goveling-rn2025 - Quick Health Check"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
WARN=0
FAIL=0

# 1. Check if node_modules exists
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules found"
    ((PASS++))
else
    echo -e "${RED}✗${NC} node_modules not found - run: npm install"
    ((FAIL++))
fi

# 2. Check ESLint
echo ""
echo "🔧 Running ESLint..."
LINT_OUTPUT=$(npm run lint 2>&1 | grep "problems")
if [ $? -eq 0 ]; then
    echo "$LINT_OUTPUT"
    PROBLEMS=$(echo "$LINT_OUTPUT" | grep -oE '[0-9]+ problems' | grep -oE '[0-9]+')
    ERRORS=$(echo "$LINT_OUTPUT" | grep -oE '[0-9]+ errors' | grep -oE '[0-9]+')
    WARNINGS=$(echo "$LINT_OUTPUT" | grep -oE '[0-9]+ warnings' | grep -oE '[0-9]+')
    
    echo -e "${YELLOW}ℹ${NC} Total: $PROBLEMS problems ($ERRORS errors, $WARNINGS warnings)"
    
    if [ "$ERRORS" -le 39 ]; then
        echo -e "${GREEN}✓${NC} Errors within acceptable range (≤39)"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} Too many errors (>39) - regression detected!"
        ((FAIL++))
    fi
    
    if [ "$WARNINGS" -le 2100 ]; then
        echo -e "${GREEN}✓${NC} Warnings within acceptable range (≤2100)"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠${NC} Warnings slightly elevated"
        ((WARN++))
    fi
else
    echo -e "${RED}✗${NC} ESLint failed to run"
    ((FAIL++))
fi

# 3. Check TypeScript (allow pre-existing errors)
echo ""
echo "📘 Running TypeScript check..."
npx tsc --noEmit > /tmp/tsc-output.txt 2>&1
TSC_ERRORS=$(grep -c "error TS" /tmp/tsc-output.txt || echo "0")
if [ "$TSC_ERRORS" -le 20 ]; then
    echo -e "${GREEN}✓${NC} TypeScript errors within expected range ($TSC_ERRORS errors)"
    echo -e "${YELLOW}ℹ${NC} Note: Some pre-existing errors are expected"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} TypeScript has $TSC_ERRORS errors (some pre-existing)"
    ((WARN++))
fi

# 4. Check recent commits
echo ""
echo "📝 Recent commits (last 5)..."
git log --oneline -5
echo -e "${GREEN}✓${NC} Git history available"
((PASS++))

# 5. Check for unstaged changes
echo ""
echo "🔄 Git status..."
UNSTAGED=$(git status --porcelain | wc -l)
if [ "$UNSTAGED" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Working directory clean"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} $UNSTAGED unstaged changes found"
    ((WARN++))
fi

# 6. Check critical files exist
echo ""
echo "📁 Checking critical files..."
CRITICAL_FILES=(
    "app/(tabs)/index.tsx"
    "app/(tabs)/explore.tsx"
    "app/(tabs)/booking.tsx"
    "app/(tabs)/trips.tsx"
    "app/(tabs)/profile.tsx"
    "src/contexts/AuthContext.tsx"
    "package.json"
    "app.json"
)

MISSING_FILES=0
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file - MISSING!"
        ((MISSING_FILES++))
    fi
done

if [ "$MISSING_FILES" -eq 0 ]; then
    ((PASS++))
else
    ((FAIL++))
fi

# 7. Check if Expo can be started (dry run)
echo ""
echo "🚀 Checking Expo configuration..."
if npx expo config --type prebuild > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Expo configuration valid"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} Expo configuration has warnings"
    ((WARN++))
fi

# Summary
echo ""
echo "========================================"
echo "📊 Summary"
echo "========================================"
echo -e "${GREEN}✓${NC} Passed: $PASS"
echo -e "${YELLOW}⚠${NC} Warnings: $WARN"
echo -e "${RED}✗${NC} Failed: $FAIL"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed!${NC}"
    echo "You can now run: npx expo start"
    exit 0
elif [ "$FAIL" -le 2 ]; then
    echo -e "${YELLOW}⚠️ Some checks failed, but app might still work${NC}"
    echo "Review the errors above before proceeding"
    exit 1
else
    echo -e "${RED}❌ Multiple checks failed - please investigate${NC}"
    exit 1
fi
