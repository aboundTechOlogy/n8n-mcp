# n8n-MCP Deployment Architecture

**This document describes the ACTUAL deployment setup for this repository.**

---

## Overview

This repository demonstrates a **dual-deployment architecture**:
1. **Local Development** (WSL) - stdio mode for development
2. **Production Server** (GCP VM) - HTTP mode with authentication for remote access

---

## 1. Local WSL Development Setup

**Purpose:** Development, testing, and local Claude Code access

**Mode:** stdio (standard input/output)

**How it runs:**
```bash
node /home/dreww/n8n-mcp/dist/mcp/index.js
```

**Configuration:**
- No HTTP server
- No authentication needed (local only)
- Direct Node.js execution
- Managed by Claude Code CLI

**Connected Clients:**
- ✅ Claude Code WSL (stdio)

**Advantages:**
- Fast development iteration
- No network overhead
- No authentication complexity
- Full access to local filesystem

---

## 2. GCP VM Production Setup

**Purpose:** Remote access from multiple clients and environments

**Mode:** HTTP server with authentication

**Location:** `/opt/ai-agent-platform/mcp-servers/n8n-mcp/`

**How it runs:**
```bash
# Systemd service
systemctl start n8n-mcp

# Executes:
/opt/ai-agent-platform/mcp-servers/n8n-mcp/load-secrets.sh
```

**Configuration:**

### Environment Variables (from Google Secrets Manager):
```bash
# Core
MCP_MODE=http
USE_FIXED_HTTP=true
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Authentication
AUTH_TOKEN=<from-google-secrets-manager>

# n8n Integration
N8N_API_URL=http://35.185.61.108:5678
N8N_API_KEY=<from-google-secrets-manager>

# Reverse Proxy
BASE_URL=https://n8n-mcp.aboundtechology.com
TRUST_PROXY=1

# OAuth (if enabled)
ENABLE_OAUTH=true  # TBD - verify actual setup
```

### Secrets in Google Secrets Manager:
```
n8n-mcp-auth-token          # Bearer token for HTTP authentication
n8n-mcp-n8n-api-key         # n8n API access key
n8n-mcp-github-client-id    # (Optional) GitHub OAuth app client ID
n8n-mcp-github-client-secret # (Optional) GitHub OAuth app client secret
```

**Connected Clients:**
- ✅ Cursor WSL (HTTP + Bearer token)
- ✅ Cursor Windows (HTTP + Bearer token)
- ✅ Claude Code Windows (HTTP + Bearer token)
- ✅ Claude Desktop (OAuth) - *if OAuth enabled*

**Network Architecture:**
```
Internet
    ↓
Caddy Reverse Proxy (HTTPS + SSL)
https://n8n-mcp.aboundtechology.com
    ↓
n8n-mcp HTTP Server (localhost:3000)
    ↓
n8n API (localhost:5678)
```

---

## Authentication Modes

The n8n-MCP server supports **three authentication modes**. The actual deployed configuration uses ONE of these:

### Mode 1: Bearer Token Only (Simplest)
```bash
ENABLE_OAUTH=false  # or omit
AUTH_TOKEN=<from-secrets>
```

**Used for:**
- Cursor (WSL & Windows)
- Claude Code (WSL & Windows via HTTP transport)

**Pros:**
- Simple configuration
- No OAuth complexity
- Works with all HTTP clients

**Cons:**
- Cannot use with Claude Desktop Custom Connectors
- Token must be rotated manually

---

### Mode 2: Built-in OAuth (Medium Complexity)
```bash
ENABLE_OAUTH=true
USE_GITHUB_OAUTH=false  # or omit
BASE_URL=https://n8n-mcp.aboundtechology.com
```

**Used for:**
- Claude Desktop Custom Connectors
- ChatGPT Custom Connectors
- Still supports bearer token fallback for Cursor/Claude Code

**Pros:**
- Works with Claude Desktop
- No external OAuth provider needed
- Server acts as its own OAuth provider

**Cons:**
- More complex than bearer token
- Requires HTTPS with valid SSL certificate
- No real user identity verification

---

### Mode 3: GitHub OAuth (Most Secure)
```bash
ENABLE_OAUTH=true
USE_GITHUB_OAUTH=true
GITHUB_CLIENT_ID=<from-secrets>
GITHUB_CLIENT_SECRET=<from-secrets>
BASE_URL=https://n8n-mcp.aboundtechology.com
```

**Used for:**
- Claude Desktop with verified GitHub user identity
- ChatGPT with verified GitHub user identity
- Still supports bearer token fallback for Cursor/Claude Code

**Pros:**
- Real user authentication via GitHub
- Users already have GitHub accounts
- Trusted OAuth flow
- More secure than built-in OAuth

**Cons:**
- Requires creating GitHub OAuth App
- More configuration complexity
- Requires managing GitHub app credentials

---

## Current Deployed Configuration

**To verify which mode is actually deployed on GCP:**

1. SSH into GCP VM:
```bash
gcloud compute ssh abound-infra-vm --zone=us-east1-c --project=abound-infr
```

2. Run verification script:
```bash
bash /opt/ai-agent-platform/mcp-servers/n8n-mcp/verify-gcp-setup.sh
```

Or from WSL, run:
```bash
./scripts/verify-gcp-setup.sh
```

This will show:
- Which authentication mode is active
- Which secrets are configured
- Which OAuth provider (if any) is being used

---

## File Structure

### Local WSL:
```
/home/dreww/n8n-mcp/
├── src/                    # Source code
├── dist/                   # Compiled output
│   └── mcp/index.js       # Entry point for stdio mode
├── data/                   # SQLite databases
├── package.json
└── tsconfig.json
```

### GCP VM:
```
/opt/ai-agent-platform/mcp-servers/n8n-mcp/
├── src/                    # Source code (cloned from GitHub)
├── dist/                   # Compiled output
│   └── mcp/index.js       # Entry point for HTTP mode
├── data/                   # SQLite databases
│   ├── nodes.db           # n8n node documentation
│   └── oauth.db           # OAuth tokens (if OAuth enabled)
├── load-secrets.sh         # Secrets loader (NOT in repo)
├── package.json
└── tsconfig.json
```

### Systemd Service:
```
/etc/systemd/system/n8n-mcp.service
```

### Caddy Configuration:
```
/opt/ai-agent-platform/proxy/Caddyfile
```
(Contains reverse proxy config for n8n-mcp.aboundtechology.com)

---

## Multi-Client Access Patterns

### From Local WSL:
```
Claude Code → stdio → node dist/mcp/index.js (local)
```

### From Cursor (WSL or Windows):
```
Cursor → HTTPS → Caddy → HTTP (localhost:3000) → n8n-mcp server
Headers: Authorization: Bearer <token>
```

### From Claude Code Windows:
```
Claude Code → HTTP transport → HTTPS → Caddy → HTTP (localhost:3000) → n8n-mcp server
Headers: Authorization: Bearer <token>
```

### From Claude Desktop (if OAuth enabled):
```
Claude Desktop → OAuth flow → GitHub (if GitHub OAuth) → n8n-mcp server
OR
Claude Desktop → OAuth flow → n8n-mcp built-in OAuth → n8n-mcp server
```

---

## Deployment Guides

- **Local Setup:** See [README.md](./README.md) - Options 1-4
- **GCP Deployment:** See [GCP_DEPLOYMENT_GUIDE.md](./GCP_DEPLOYMENT_GUIDE.md)
- **Multi-IDE Setup:** See [SECURE_MULTI_IDE_SETUP.md](./SECURE_MULTI_IDE_SETUP.md)
- **HTTP Transport Migration:** See [MIGRATION_TO_HTTP.md](./MIGRATION_TO_HTTP.md)

---

## Security Considerations

### Local WSL:
- ✅ No network exposure (localhost only)
- ✅ No authentication needed
- ⚠️ Anyone with access to your WSL can use it

### GCP Production:
- ✅ HTTPS with valid SSL certificate
- ✅ Bearer token or OAuth authentication
- ✅ Secrets stored in Google Secrets Manager (not in files)
- ✅ Systemd security hardening
- ⚠️ Bearer tokens in client configs (Cursor, Claude Code)
- ✅ OAuth tokens auto-expire (if OAuth enabled)

---

## Maintenance

### Update Local:
```bash
cd /home/dreww/n8n-mcp
git pull
npm install
npm run build
```

### Update GCP:
```bash
# SSH to VM
gcloud compute ssh abound-infra-vm --zone=us-east1-c --project=abound-infr

# Update code
cd /opt/ai-agent-platform/mcp-servers/n8n-mcp
sudo git pull
sudo npm ci --omit=dev
sudo npm run build

# Restart service
sudo systemctl restart n8n-mcp

# Verify
sudo systemctl status n8n-mcp
```

---

**Last Updated:** October 2025
**Verified Against:** Actual deployment on abound-infra-vm (35.185.61.108)
