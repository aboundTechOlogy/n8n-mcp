#!/bin/bash
# Cleanup script to remove development-only files
# Prepares the repository for forking and production deployment

set -e

echo "🧹 Cleaning up n8n-mcp repository..."
echo ""

# Test scripts to remove (development-only, not needed for deployment)
TEST_SCRIPTS=(
  "scripts/test-all-58-tools.ts"
  "scripts/test-code-node-enhancements.ts"
  "scripts/test-code-node-fixes.ts"
  "scripts/test-empty-connection-validation.ts"
  "scripts/test-error-output-validation.ts"
  "scripts/test-essentials.ts"
  "scripts/test-expression-code-validation.ts"
  "scripts/test-fts5-search.ts"
  "scripts/test-fuzzy-fix.ts"
  "scripts/test-fuzzy-simple.ts"
  "scripts/test-helpers-validation.ts"
  "scripts/test-http-search.ts"
  "scripts/test-jmespath-validation.ts"
  "scripts/test-multi-tenant-simple.ts"
  "scripts/test-multi-tenant.ts"
  "scripts/test-node-type-validation.ts"
  "scripts/test-nodes-base-prefix.ts"
  "scripts/test-operation-validation.ts"
  "scripts/test-search-improvements.ts"
  "scripts/test-security.ts"
  "scripts/test-sqljs-triggers.ts"
  "scripts/test-telemetry-debug.ts"
  "scripts/test-telemetry-direct.ts"
  "scripts/test-telemetry-env.ts"
  "scripts/test-telemetry-integration.ts"
  "scripts/test-telemetry-no-select.ts"
  "scripts/test-telemetry-security.ts"
  "scripts/test-telemetry-simple.ts"
  "scripts/test-typeversion-validation.ts"
  "scripts/test-url-configuration.ts"
  "scripts/test-webhook-validation.ts"
  "scripts/test-workflow-insert.ts"
  "scripts/test-workflow-sanitizer.ts"
  "scripts/test-workflow-tracking-debug.ts"
  "scripts/quick-test.ts"
)

# Documentation files to remove (too specific to development setup)
DOC_FILES=(
  "CLAUDE_DESKTOP_WSL_SETUP.md"
)

echo "📝 Removing development-only test scripts..."
REMOVED_COUNT=0
for file in "${TEST_SCRIPTS[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  ✓ Removed: $file"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
  fi
done

echo ""
echo "📄 Removing development-specific documentation..."
for file in "${DOC_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  ✓ Removed: $file"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
  fi
done

echo ""
echo "✅ Cleanup complete!"
echo "   Removed $REMOVED_COUNT files"
echo ""
echo "📦 Essential files kept:"
echo "   • README.md (main documentation)"
echo "   • GCP_DEPLOYMENT_GUIDE.md (deployment guide)"
echo "   • CHANGELOG.md (version history)"
echo "   • LICENSE (legal)"
echo "   • All source code in src/"
echo "   • Essential scripts for deployment"
echo "   • Docker configuration files"
echo ""
echo "🔧 Next steps:"
echo "   1. Test the build: npm run build"
echo "   2. Run tests: npm test"
echo "   3. Review changes: git status"
echo "   4. Commit: git add -A && git commit -m 'chore: remove development-only files'"
echo "   5. Push: git push"
