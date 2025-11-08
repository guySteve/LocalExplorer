#!/bin/bash

# 🔍 LocalExplorer Deployment Verification Script
# This script checks if your repository is ready for Netlify deployment

echo "🔍 Checking LocalExplorer deployment readiness..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check for netlify.toml
echo -n "Checking for netlify.toml... "
if [ -f "netlify.toml" ]; then
    echo -e "${GREEN}✓ Found${NC}"
else
    echo -e "${RED}✗ Missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check for Netlify functions
echo -n "Checking for Netlify functions directory... "
if [ -d "netlify/functions" ]; then
    FUNC_COUNT=$(ls -1 netlify/functions/*.js 2>/dev/null | wc -l)
    echo -e "${GREEN}✓ Found ($FUNC_COUNT functions)${NC}"
else
    echo -e "${RED}✗ Missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check for required serverless functions
echo "Checking for required serverless functions:"
REQUIRED_FUNCTIONS=("ticketmaster.js" "what3words.js" "foursquare.js" "ebird.js" "holiday.js" "recreation.js" "nps.js")
for func in "${REQUIRED_FUNCTIONS[@]}"; do
    echo -n "  - $func... "
    if [ -f "netlify/functions/$func" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ Missing (optional)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# Check for package.json
echo -n "Checking for package.json... "
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓ Found${NC}"
    
    # Check for deploy script
    echo -n "  - Checking for deploy script... "
    if grep -q '"deploy"' package.json; then
        echo -e "${GREEN}✓ Found${NC}"
    else
        echo -e "${YELLOW}⚠ Missing (optional)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠ Missing (optional)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check for .env.example
echo -n "Checking for .env.example... "
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓ Found${NC}"
else
    echo -e "${YELLOW}⚠ Missing (recommended)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check for key.js
echo -n "Checking for key.js... "
if [ -f "key.js" ]; then
    echo -e "${GREEN}✓ Found${NC}"
    
    # Check if key.js contains hardcoded API keys (security check)
    echo -n "  - Checking for hardcoded API keys... "
    if grep -q "window\.[A-Z_]*API_KEY\s*=\s*['\"][^'\"]\{10,\}" key.js; then
        echo -e "${RED}✗ Found hardcoded keys (SECURITY RISK!)${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓ No hardcoded keys${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Missing${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check for GitHub Actions workflow
echo -n "Checking for GitHub Actions workflow... "
if [ -f ".github/workflows/netlify-deploy.yml" ]; then
    echo -e "${GREEN}✓ Found${NC}"
else
    echo -e "${YELLOW}⚠ Missing (optional for automated deployments)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check for documentation
echo "Checking for documentation:"
DOCS=("README.md" "CURRENT_FEATURES.md" "PROJECT_SUMMARY.md")
for doc in "${DOCS[@]}"; do
    echo -n "  - $doc... "
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ Missing${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# Check .gitignore
echo -n "Checking .gitignore for sensitive files... "
if [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore && grep -q "\.netlify" .gitignore; then
        echo -e "${GREEN}✓ Properly configured${NC}"
    else
        echo -e "${YELLOW}⚠ May need updates${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗ Missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check for index.html
echo -n "Checking for index.html... "
if [ -f "index.html" ]; then
    echo -e "${GREEN}✓ Found${NC}"
else
    echo -e "${RED}✗ Missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Your repository is ready for Netlify deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Deploy to Netlify using one of these methods:"
    echo "   - Click 'Deploy to Netlify' button in README"
    echo "   - Use 'netlify deploy --prod' command"
    echo "   - Set up GitHub Actions for automated deployment"
    echo "2. Add environment variables in Netlify dashboard"
    echo "3. Test your deployed site"
    echo ""
    echo "📖 See README.md and PROJECT_SUMMARY.md for detailed deployment instructions"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found, but deployment should work.${NC}"
    echo ""
    echo "You can proceed with deployment, but consider addressing the warnings."
    echo "📖 See README.md and PROJECT_SUMMARY.md for detailed deployment instructions"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found.${NC}"
    echo ""
    echo "Please fix the errors before deploying."
    echo "📖 See README.md and PROJECT_SUMMARY.md for setup instructions"
    exit 1
fi
