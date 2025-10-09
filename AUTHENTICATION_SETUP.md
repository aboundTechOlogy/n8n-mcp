# n8n-MCP Authentication Setup Guide

**Choose the authentication mode that matches your deployment.**

---

## Quick Decision Tree

**Do you need Claude Desktop support?**
- **NO** → Use **Mode 1: Bearer Token Only** (simplest)
- **YES** → Continue...

**Do you want GitHub-verified user identity?**
- **YES** → Use **Mode 3: GitHub OAuth** (most secure)
- **NO** → Use **Mode 2: Built-in OAuth** (simpler)

---

## Mode 1: Bearer Token Only (Simplest)

**Best for:** Cursor, Claude Code, or any HTTP client that supports bearer tokens

**Does NOT work with:** Claude Desktop Custom Connectors

### Setup

**1. Generate bearer token:**
```bash
openssl rand -base64 32
```

**2. Store in Google Secrets Manager:**
```bash
echo -n "YOUR_GENERATED_TOKEN" | \
  gcloud secrets create n8n-mcp-auth-token \
  --data-file=- \
  --project=abound-infr
```

**3. Configure `load-secrets.sh`:**
```bash
#!/bin/bash
set -e

PROJECT_ID="abound-infr"

# Fetch secrets
export AUTH_TOKEN=$(gcloud secrets versions access latest --secret="n8n-mcp-auth-token" --project="$PROJECT_ID")
export N8N_API_KEY=$(gcloud secrets versions access latest --secret="n8n-mcp-n8n-api-key" --project="$PROJECT_ID")

# Core configuration
export MCP_MODE=http
export NODE_ENV=production
export PORT=3000
export HOST=0.0.0.0

# OAuth DISABLED
export ENABLE_OAUTH=false

# n8n API
export N8N_API_URL=http://35.185.61.108:5678
export BASE_URL=https://n8n-mcp.aboundtechology.com
export TRUST_PROXY=1

exec /usr/bin/node /opt/ai-agent-platform/mcp-servers/n8n-mcp/dist/mcp/index.js
```

**4. Client Configuration:**
```bash
# Cursor (WSL/Windows)
{
  "url": "https://n8n-mcp.aboundtechology.com/mcp",
  "transport": {
    "type": "http",
    "headers": {
      "Authorization": "Bearer YOUR_TOKEN_HERE"
    }
  }
}

# Claude Code (Windows)
claude mcp add -t http n8n-mcp-gcp https://n8n-mcp.aboundtechology.com/mcp -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Mode 2: Built-in OAuth (Medium Complexity)

**Best for:** Claude Desktop + Cursor/Claude Code (both work)

**Supports:** All clients

### Setup

**1. Generate bearer token (still needed as fallback):**
```bash
openssl rand -base64 32
```

**2. Store in Google Secrets Manager:**
```bash
echo -n "YOUR_GENERATED_TOKEN" | \
  gcloud secrets create n8n-mcp-auth-token \
  --data-file=- \
  --project=abound-infr
```

**3. Configure `load-secrets.sh`:**
```bash
#!/bin/bash
set -e

PROJECT_ID="abound-infr"

# Fetch secrets
export AUTH_TOKEN=$(gcloud secrets versions access latest --secret="n8n-mcp-auth-token" --project="$PROJECT_ID")
export N8N_API_KEY=$(gcloud secrets versions access latest --secret="n8n-mcp-n8n-api-key" --project="$PROJECT_ID")

# Core configuration
export MCP_MODE=http
export NODE_ENV=production
export PORT=3000
export HOST=0.0.0.0

# OAuth ENABLED (built-in)
export ENABLE_OAUTH=true
export USE_GITHUB_OAUTH=false  # Use built-in OAuth
export BASE_URL=https://n8n-mcp.aboundtechology.com

# n8n API
export N8N_API_URL=http://35.185.61.108:5678
export TRUST_PROXY=1

exec /usr/bin/node /opt/ai-agent-platform/mcp-servers/n8n-mcp/dist/mcp/index.js
```

**4. Client Configuration:**

**Claude Desktop:**
1. Settings → Connectors → Add Connector
2. Enter URL: `https://n8n-mcp.aboundtechology.com/mcp`
3. Claude will auto-discover OAuth endpoints
4. Click "Authorize" in browser
5. Done!

**Cursor/Claude Code (still use bearer token):**
Same as Mode 1 - bearer token authentication still works as fallback.

---

## Mode 3: GitHub OAuth (Most Secure)

**Best for:** Claude Desktop with verified GitHub user identity + Cursor/Claude Code

**Supports:** All clients

**Requires:** Creating a GitHub OAuth App

### Setup

**1. Create GitHub OAuth App:**

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** n8n-MCP Server
   - **Homepage URL:** `https://n8n-mcp.aboundtechology.com`
   - **Authorization callback URL:** `https://n8n-mcp.aboundtechology.com/oauth/callback`
4. Click "Register application"
5. Copy **Client ID**
6. Click "Generate a new client secret"
7. Copy **Client Secret** (shown only once!)

**2. Generate bearer token (still needed as fallback):**
```bash
openssl rand -base64 32
```

**3. Store ALL secrets in Google Secrets Manager:**
```bash
# Bearer token
echo -n "YOUR_GENERATED_TOKEN" | \
  gcloud secrets create n8n-mcp-auth-token \
  --data-file=- \
  --project=abound-infr

# GitHub OAuth credentials
echo -n "YOUR_GITHUB_CLIENT_ID" | \
  gcloud secrets create n8n-mcp-github-client-id \
  --data-file=- \
  --project=abound-infr

echo -n "YOUR_GITHUB_CLIENT_SECRET" | \
  gcloud secrets create n8n-mcp-github-client-secret \
  --data-file=- \
  --project=abound-infr
```

**4. Grant VM access to secrets:**
```bash
VM_SERVICE_ACCOUNT=$(gcloud compute instances describe abound-infra-vm \
  --zone=us-east1-c \
  --format='get(serviceAccounts[0].email)')

gcloud secrets add-iam-policy-binding n8n-mcp-github-client-id \
  --member="serviceAccount:$VM_SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding n8n-mcp-github-client-secret \
  --member="serviceAccount:$VM_SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

**5. Configure `load-secrets.sh`:**
```bash
#!/bin/bash
set -e

PROJECT_ID="abound-infr"

# Fetch secrets
export AUTH_TOKEN=$(gcloud secrets versions access latest --secret="n8n-mcp-auth-token" --project="$PROJECT_ID")
export N8N_API_KEY=$(gcloud secrets versions access latest --secret="n8n-mcp-n8n-api-key" --project="$PROJECT_ID")

# GitHub OAuth credentials
export GITHUB_CLIENT_ID=$(gcloud secrets versions access latest --secret="n8n-mcp-github-client-id" --project="$PROJECT_ID")
export GITHUB_CLIENT_SECRET=$(gcloud secrets versions access latest --secret="n8n-mcp-github-client-secret" --project="$PROJECT_ID")

# Core configuration
export MCP_MODE=http
export NODE_ENV=production
export PORT=3000
export HOST=0.0.0.0

# OAuth ENABLED (GitHub)
export ENABLE_OAUTH=true
export USE_GITHUB_OAUTH=true  # Use GitHub OAuth
export BASE_URL=https://n8n-mcp.aboundtechology.com

# n8n API
export N8N_API_URL=http://35.185.61.108:5678
export TRUST_PROXY=1

exec /usr/bin/node /opt/ai-agent-platform/mcp-servers/n8n-mcp/dist/mcp/index.js
```

**6. Client Configuration:**

**Claude Desktop:**
1. Settings → Connectors → Add Connector
2. Enter URL: `https://n8n-mcp.aboundtechology.com/mcp`
3. Claude will auto-discover OAuth endpoints
4. Click "Authorize" - **redirects to GitHub**
5. Authorize the GitHub app
6. Redirected back to Claude Desktop
7. Done! (User authenticated via GitHub)

**Cursor/Claude Code (still use bearer token):**
Same as Mode 1 - bearer token authentication still works as fallback.

---

## Comparison Table

| Feature | Bearer Only | Built-in OAuth | GitHub OAuth |
|---------|-------------|----------------|--------------|
| **Complexity** | ⭐ Simple | ⭐⭐ Medium | ⭐⭐⭐ Complex |
| **Claude Desktop** | ❌ No | ✅ Yes | ✅ Yes |
| **Cursor** | ✅ Yes | ✅ Yes (fallback) | ✅ Yes (fallback) |
| **Claude Code** | ✅ Yes | ✅ Yes (fallback) | ✅ Yes (fallback) |
| **User Identity** | ❌ No | ❌ No | ✅ GitHub verified |
| **External Setup** | None | None | GitHub OAuth App |
| **Secrets Needed** | 1 | 1 | 3 |
| **Token Rotation** | Manual | Auto (OAuth) | Auto (OAuth) |
| **Security** | ⭐⭐ Good | ⭐⭐⭐ Better | ⭐⭐⭐⭐ Best |

---

## Verifying Your Current Setup

**Run this on GCP VM:**
```bash
bash /opt/ai-agent-platform/mcp-servers/n8n-mcp/scripts/verify-gcp-setup.sh
```

**Or check logs:**
```bash
sudo journalctl -u n8n-mcp -n 50 | grep "OAuth configuration"
```

Look for:
```
OAuth configuration { enableOAuth: true, useGitHub: true, ... }  # GitHub OAuth
OAuth configuration { enableOAuth: true, useGitHub: false, ... } # Built-in OAuth
OAuth disabled - using Bearer token authentication only          # Bearer only
```

---

## Migration Between Modes

**From Bearer to Built-in OAuth:**
1. Update `load-secrets.sh` - add `ENABLE_OAUTH=true`, `USE_GITHUB_OAUTH=false`
2. Restart service: `sudo systemctl restart n8n-mcp`
3. No client changes needed (bearer still works)

**From Built-in OAuth to GitHub OAuth:**
1. Create GitHub OAuth App
2. Store GitHub secrets in Google Secrets Manager
3. Update `load-secrets.sh` - add GitHub secret fetching, set `USE_GITHUB_OAUTH=true`
4. Restart service: `sudo systemctl restart n8n-mcp`
5. No client changes needed (both OAuth and bearer still work)

**From GitHub OAuth to Bearer Only:**
1. Update `load-secrets.sh` - set `ENABLE_OAUTH=false`
2. Restart service: `sudo systemctl restart n8n-mcp`
3. Claude Desktop will stop working (needs OAuth)

---

## Recommended Setup

**For personal use (you + team):** Mode 3 (GitHub OAuth)
- Real user authentication
- Works with all clients
- Most secure

**For open source / public deployment:** Mode 2 (Built-in OAuth)
- No GitHub app setup needed by users
- Works with all clients
- Simpler for others to replicate

**For simple/testing:** Mode 1 (Bearer Token)
- Simplest setup
- Good for development
- Cursor/Claude Code only

---

**Current Repository Setup:** TBD - run verification script to confirm

**Last Updated:** October 2025
