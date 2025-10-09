#!/bin/bash
# Script to verify actual GCP deployment configuration
# Run this on GCP VM to see what's actually deployed

echo "=== n8n-MCP GCP Deployment Verification ==="
echo ""

echo "1. Service Status:"
systemctl status n8n-mcp --no-pager | head -10
echo ""

echo "2. Service Configuration:"
cat /etc/systemd/system/n8n-mcp.service | grep -E "ExecStart|WorkingDirectory"
echo ""

echo "3. Secrets Loader Script:"
if [ -f /opt/ai-agent-platform/mcp-servers/n8n-mcp/load-secrets.sh ]; then
  echo "Found: /opt/ai-agent-platform/mcp-servers/n8n-mcp/load-secrets.sh"
  cat /opt/ai-agent-platform/mcp-servers/n8n-mcp/load-secrets.sh | grep "export" | grep -v "^#"
else
  echo "NOT FOUND: load-secrets.sh"
fi
echo ""

echo "4. Google Secrets (names only):"
gcloud secrets list --project=abound-infr --filter="name~n8n-mcp" --format="table(name)" 2>/dev/null || echo "Cannot list secrets (auth issue)"
echo ""

echo "5. Environment Variables Being Used:"
systemctl show n8n-mcp --property=Environment 2>/dev/null || echo "Cannot show environment"
echo ""

echo "6. Recent Logs (last 20 lines):"
journalctl -u n8n-mcp -n 20 --no-pager | grep -E "OAuth|GitHub|authentication|started"
echo ""

echo "=== Summary ==="
echo "If you see:"
echo "  - ENABLE_OAUTH=true + USE_GITHUB_OAUTH=true → Using GitHub OAuth"
echo "  - ENABLE_OAUTH=true (no GitHub vars) → Using built-in OAuth"
echo "  - No ENABLE_OAUTH → Using Bearer token only"
