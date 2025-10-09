# GCP VM Deployment Guide for n8n-MCP

Complete guide for deploying n8n-MCP as a remote HTTP server on Google Cloud Platform VM, optimized for co-location with your n8n instance.

## 🎯 Overview

This deployment will:
- Install n8n-MCP on your GCP VM (adjacent to n8n for optimal latency)
- Configure HTTP server with Bearer token authentication
- Set up systemd service for production reliability
- Configure Nginx reverse proxy with SSL
- Enable access via Claude Desktop Custom Connectors (no credentials in config files)

## ✅ Pre-Deployment Checklist

### Local Machine (Before SSH)
- [ ] All changes committed to git
- [ ] Latest code pushed to GitHub
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Tests pass (`npm test`)

### GCP VM Requirements
- [ ] Ubuntu 20.04+ or Debian 11+
- [ ] Node.js 20.x LTS
- [ ] 512MB RAM minimum (1GB recommended)
- [ ] 1GB disk space for application + database
- [ ] Firewall rules allow port 443 (HTTPS)
- [ ] Domain name pointing to VM (for SSL)

## 📦 Installation Steps

### Step 1: System Preparation

**Current VM State (Verified):**
- ✅ VM: abound-infra-vm (e2-standard-2)
- ✅ External IP: 35.185.61.108
- ✅ n8n: Running in Docker on port 5678, data in `/var/lib/n8n`
- ✅ gcloud: Version 531.0.0 installed
- ✅ Google Secrets Manager: Available (24 existing secrets)
- ⚠️ Node.js: v18.20.4 (needs upgrade to v20)

```bash
# Connect to your GCP VM
gcloud compute ssh abound-infra-vm --zone=us-east1-c --project=abound-infr

# Update system packages
sudo apt update && sudo apt upgrade -y

# Upgrade Node.js from v18 to v20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install additional tools (git and curl already present)
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Verify installations
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

### Step 2: Application Setup

```bash
# Create application directory
sudo mkdir -p /opt/n8n-mcp
cd /opt/n8n-mcp

# Clone repository
sudo git clone https://github.com/czlonkowski/n8n-mcp.git .

# Install production dependencies only
sudo npm ci --omit=dev

# Build TypeScript
sudo npm run build

# Verify database exists
ls -lh data/nodes.db  # Should show ~49MB file
```

### Step 3: Configure Google Secrets Manager (Recommended for GCP)

**🔐 BEST PRACTICE**: Use Google Secrets Manager instead of storing credentials in files.

```bash
# Enable Secret Manager API (if not already enabled)
gcloud services enable secretmanager.googleapis.com

# Generate and store AUTH_TOKEN
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create n8n-mcp-auth-token \
  --data-file=- \
  --replication-policy="automatic" \
  --project=abound-infr

# Store N8N_API_KEY (get from n8n Settings > API first)
# Open http://35.185.61.108:5678 → Settings → API → Create API Key
echo -n "YOUR_N8N_API_KEY_HERE" | \
  gcloud secrets create n8n-mcp-n8n-api-key \
  --data-file=- \
  --replication-policy="automatic" \
  --project=abound-infr

# Get your VM's service account
VM_SERVICE_ACCOUNT=$(gcloud compute instances describe abound-infra-vm \
  --zone=us-east1-c \
  --project=abound-infr \
  --format='get(serviceAccounts[0].email)')

echo "VM Service Account: $VM_SERVICE_ACCOUNT"

# Grant VM access to secrets
gcloud secrets add-iam-policy-binding n8n-mcp-auth-token \
  --member="serviceAccount:$VM_SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor" \
  --project=abound-infr

gcloud secrets add-iam-policy-binding n8n-mcp-n8n-api-key \
  --member="serviceAccount:$VM_SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor" \
  --project=abound-infr

# Verify access (run this ON THE VM)
gcloud secrets versions access latest --secret="n8n-mcp-auth-token"
```

**Save the AUTH_TOKEN for client configuration:**
```bash
# Copy this token - you'll paste it in Claude Desktop/ChatGPT/Cursor
gcloud secrets versions access latest --secret="n8n-mcp-auth-token"
```

### Step 4: Configure Environment with Secrets Manager

Create a startup script that fetches secrets and configures the service:

```bash
# Create secrets loader script
sudo nano /opt/n8n-mcp/load-secrets.sh
```

**Paste this script:**

```bash
#!/bin/bash
# Google Secrets Manager loader for n8n-MCP
set -e

PROJECT_ID="abound-infr"

echo "Loading secrets from Google Secret Manager..."

# Fetch secrets
export AUTH_TOKEN=$(gcloud secrets versions access latest --secret="n8n-mcp-auth-token" --project="$PROJECT_ID")
export N8N_API_KEY=$(gcloud secrets versions access latest --secret="n8n-mcp-n8n-api-key" --project="$PROJECT_ID")

# Core configuration
export MCP_MODE=http
export USE_FIXED_HTTP=true
export NODE_ENV=production
export PORT=3000
export HOST=0.0.0.0

# Database
export NODE_DB_PATH=/opt/n8n-mcp/data/nodes.db

# Logging
export LOG_LEVEL=info

# n8n API
export N8N_API_URL=http://localhost:5678
export N8N_API_TIMEOUT=30000
export N8N_API_MAX_RETRIES=3

# Reverse Proxy
export BASE_URL=https://n8n-mcp.your-domain.com
export TRUST_PROXY=1

echo "Secrets loaded successfully"

# Start the application
exec /usr/bin/node /opt/n8n-mcp/dist/mcp/index.js
```

**Make the script executable:**
```bash
sudo chmod +x /opt/n8n-mcp/load-secrets.sh
```

**Alternative: Environment File (Less Secure)**

If you prefer not to use Secrets Manager, create a `.env` file:

```bash
sudo nano /opt/n8n-mcp/.env
```

```bash
MCP_MODE=http
USE_FIXED_HTTP=true
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
NODE_DB_PATH=/opt/n8n-mcp/data/nodes.db
LOG_LEVEL=info

# Get these from:
# AUTH_TOKEN: openssl rand -base64 32
# N8N_API_KEY: n8n Settings > API > Create API Key
AUTH_TOKEN=<PASTE_TOKEN_HERE>
N8N_API_KEY=<PASTE_API_KEY_HERE>

N8N_API_URL=http://localhost:5678
N8N_API_TIMEOUT=30000
N8N_API_MAX_RETRIES=3
BASE_URL=https://n8n-mcp.your-domain.com
TRUST_PROXY=1

# OAuth 2.0 Configuration (for Claude Desktop/ChatGPT Custom Connectors)
ENABLE_OAUTH=true
```

### Step 5: Create System User and Set Permissions

```bash
# Create dedicated system user
sudo useradd -r -s /bin/false n8n-mcp

# Set ownership
sudo chown -R n8n-mcp:n8n-mcp /opt/n8n-mcp

# Secure the .env file
sudo chmod 600 /opt/n8n-mcp/.env
```

### Step 6: Create Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/n8n-mcp.service
```

**Paste this configuration:**

**Option A: With Google Secrets Manager (Recommended)**

```ini
[Unit]
Description=n8n-MCP HTTP Server
Documentation=https://github.com/czlonkowski/n8n-mcp
After=network.target
Requires=network.target

[Service]
Type=simple
User=n8n-mcp
Group=n8n-mcp
WorkingDirectory=/opt/n8n-mcp

# Use secrets loader script
ExecStart=/opt/n8n-mcp/load-secrets.sh

# Restart policy
Restart=always
RestartSec=10
StartLimitBurst=5
StartLimitInterval=60s

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/n8n-mcp/data
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true

# Resource limits
MemoryLimit=512M
CPUQuota=50%
LimitNOFILE=65536

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=n8n-mcp

[Install]
WantedBy=multi-user.target
```

**Option B: With .env File (Alternative)**

```ini
[Unit]
Description=n8n-MCP HTTP Server
Documentation=https://github.com/czlonkowski/n8n-mcp
After=network.target
Requires=network.target

[Service]
Type=simple
User=n8n-mcp
Group=n8n-mcp
WorkingDirectory=/opt/n8n-mcp

# Load environment from file
EnvironmentFile=/opt/n8n-mcp/.env
ExecStart=/usr/bin/node /opt/n8n-mcp/dist/mcp/index.js

# Restart policy
Restart=always
RestartSec=10
StartLimitBurst=5
StartLimitInterval=60s

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/n8n-mcp/data
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true

# Resource limits
MemoryLimit=512M
CPUQuota=50%
LimitNOFILE=65536

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=n8n-mcp

[Install]
WantedBy=multi-user.target
```

**Start the service:**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable n8n-mcp

# Start the service
sudo systemctl start n8n-mcp

# Check status
sudo systemctl status n8n-mcp

# View logs
sudo journalctl -u n8n-mcp -f
```

You should see:
```
Loading secrets from Google Secret Manager...
Secrets loaded successfully
[INFO] Starting n8n-MCP HTTP Server v2.14.1...
[INFO] Server running at http://0.0.0.0:3000
[INFO] Endpoints:
[INFO]   Health: http://0.0.0.0:3000/health
[INFO]   MCP:    http://0.0.0.0:3000/mcp
```

### Step 7: Test Local Connection

```bash
# Test health endpoint (replace YOUR_TOKEN with your actual token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/health

# Expected response:
# {"status":"ok","mode":"http-fixed","version":"2.14.1",...}

# Test MCP endpoint
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Should return list of 58 MCP tools
```

### Step 8: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/n8n-mcp
```

**Paste this configuration** (replace `n8n-mcp.your-domain.com`):

```nginx
server {
    listen 80;
    server_name n8n-mcp.your-domain.com;

    # Redirect to HTTPS (will be configured by certbot)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name n8n-mcp.your-domain.com;

    # SSL certificates (will be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/n8n-mcp.your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/n8n-mcp.your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # MCP endpoint
    location /mcp {
        proxy_pass http://localhost:3000/mcp;
        proxy_http_version 1.1;

        # Forward headers (IMPORTANT for authentication)
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Host $host;

        # Allow unauthenticated health checks from monitoring
        # Remove this if you want health checks to be authenticated
        proxy_set_header X-Health-Check "true";
    }

    # Deny access to all other paths
    location / {
        return 404;
    }
}
```

**Enable site and get SSL certificate:**

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/n8n-mcp /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d n8n-mcp.your-domain.com
```

Follow certbot prompts and select option to redirect HTTP to HTTPS.

### Step 9: Configure Firewall

```bash
# Allow HTTPS traffic
sudo ufw allow 443/tcp comment 'HTTPS for n8n-mcp'

# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp comment 'SSH'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 10: Final Testing

```bash
# Test public HTTPS endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://n8n-mcp.your-domain.com/health

# Expected: {"status":"ok",...}

# Test MCP endpoint
curl -X POST https://n8n-mcp.your-domain.com/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Should return JSON with 58 tools
```

## 🔌 Client Configuration

### OAuth 2.0 Authentication

The n8n-MCP server now supports OAuth 2.0 with Dynamic Client Registration, which is required for Claude Desktop and ChatGPT Custom Connectors. The server automatically handles the OAuth flow when `ENABLE_OAUTH=true` is set.

**OAuth Endpoints** (automatically configured):
- Authorization Server Metadata: `https://n8n-mcp.your-domain.com/.well-known/oauth-authorization-server`
- Client Registration: `https://n8n-mcp.your-domain.com/oauth/register`
- Authorization: `https://n8n-mcp.your-domain.com/oauth/authorize`
- Token Exchange: `https://n8n-mcp.your-domain.com/oauth/token`
- MCP Endpoint: `https://n8n-mcp.your-domain.com/mcp`

### Claude Desktop (Custom Connectors)

**Requirements:**
- Claude Pro, Max, Team, or Enterprise plan
- OAuth 2.0 enabled on server (`ENABLE_OAUTH=true`)

**Steps:**
1. Open Claude Desktop
2. Go to **Settings** > **Connectors**
3. Click **Add Connector**
4. Enter the MCP server URL: `https://n8n-mcp.your-domain.com/mcp`
5. Claude will automatically:
   - Discover OAuth endpoints via server metadata
   - Register as an OAuth client using Dynamic Client Registration
   - Open a browser for authorization
6. Click **Authorize** in the browser
7. Return to Claude Desktop - the connector will be active!

The server will issue OAuth tokens valid for 1 hour. Claude handles token refresh automatically.

### Cursor IDE

1. Open Cursor Settings
2. Go to **Features** > **MCP Servers**
3. Click **Add Server**
4. Configure:
   - **Name**: `n8n-mcp`
   - **Type**: `HTTP`
   - **URL**: `https://n8n-mcp.your-domain.com/mcp`
   - **Authorization**: `Bearer YOUR_TOKEN_HERE`
5. Save and restart Cursor

### Claude Code (VSCode Extension)

Similar to Cursor - use the extension's UI to add the MCP server with your token.

### ChatGPT (Custom Connectors)

**Requirements:**
- ChatGPT Pro, Business, Enterprise, or Edu plan
- OAuth 2.0 enabled on server (`ENABLE_OAUTH=true`)

**Steps:**
1. Open ChatGPT (web or desktop app)
2. Go to **Settings** > **Connectors**
3. Click **Add Connector** or **+ New Connector**
4. Select **Custom Connector** type
5. Enter the MCP server URL: `https://n8n-mcp.your-domain.com/mcp`
6. Select **OAuth 2.0** authentication
7. ChatGPT will automatically:
   - Discover OAuth endpoints via server metadata
   - Register as an OAuth client
   - Open authorization flow
8. Click **Authorize** in the popup
9. Return to ChatGPT - the connector will be active!

You can now reference n8n workflows and nodes directly in ChatGPT!

## 🔐 Security Best Practices

### Token Management

✅ **DO:**
- Generate strong tokens (32+ characters): `openssl rand -base64 32`
- Store tokens in password managers
- Use different tokens for dev/staging/prod
- Rotate tokens every 90 days
- Monitor authentication failures in logs

❌ **DON'T:**
- Commit tokens to version control
- Share tokens between environments
- Use weak or default tokens
- Store tokens in config files that sync to cloud

### Server Security

```bash
# Monitor authentication attempts
sudo journalctl -u n8n-mcp | grep "Authentication failed"

# Monitor service status
sudo systemctl status n8n-mcp

# Check resource usage
sudo systemctl show n8n-mcp --property=MemoryCurrent
```

### Token Rotation

**Option A: With Google Secrets Manager (Recommended)**

```bash
# 1. Generate new token
NEW_TOKEN=$(openssl rand -base64 32)
echo "New token: $NEW_TOKEN"

# 2. Update secret in Google Secrets Manager
echo -n "$NEW_TOKEN" | \
  gcloud secrets versions add n8n-mcp-auth-token \
  --data-file=- \
  --project=abound-infr

# 3. Restart service (will fetch new token on startup)
sudo systemctl restart n8n-mcp

# 4. Verify new token works
curl -H "Authorization: Bearer $NEW_TOKEN" \
     https://n8n-mcp.your-domain.com/health

# 5. Update all client configurations
# - Claude Desktop: Settings > Connectors > Edit
# - ChatGPT: Settings > Connectors > Edit
# - Cursor: MCP Servers settings
# - Claude Code: Extension settings
```

**Option B: With .env File (Alternative)**

```bash
# 1. Generate new token
NEW_TOKEN=$(openssl rand -base64 32)
echo "New token: $NEW_TOKEN"

# 2. Update .env file
sudo nano /opt/n8n-mcp/.env
# Replace AUTH_TOKEN value

# 3. Restart service
sudo systemctl restart n8n-mcp

# 4. Update all client configurations
# - Claude Desktop: Settings > Connectors > Edit
# - ChatGPT: Settings > Connectors > Edit
# - Cursor: MCP Servers settings
# - Claude Code: Extension settings
```

## 📊 Monitoring & Maintenance

### Check Service Status

```bash
# Service status
sudo systemctl status n8n-mcp

# Real-time logs
sudo journalctl -u n8n-mcp -f

# Last 100 log lines
sudo journalctl -u n8n-mcp -n 100

# Check for errors
sudo journalctl -u n8n-mcp -p err
```

### Resource Monitoring

```bash
# Memory usage
sudo systemctl show n8n-mcp --property=MemoryCurrent

# CPU usage
top -b -n 1 | grep n8n-mcp

# Disk usage
du -sh /opt/n8n-mcp
```

### Updates

```bash
# Pull latest code
cd /opt/n8n-mcp
sudo -u n8n-mcp git pull

# Install dependencies
sudo -u n8n-mcp npm ci --omit=dev

# Rebuild
sudo -u n8n-mcp npm run build

# Restart service
sudo systemctl restart n8n-mcp

# Verify
sudo systemctl status n8n-mcp
```

## 🆘 Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u n8n-mcp -n 50

# Common issues:
# - Secrets Manager: VM lacks permission to access secrets
# - .env file: Missing AUTH_TOKEN in .env
# - Port 3000 already in use
# - Database file missing
# - Incorrect permissions

# For Secrets Manager issues:
# Test secret access manually
gcloud secrets versions access latest --secret="n8n-mcp-auth-token" --project="abound-infr"

# For .env file issues:
# Fix permissions
sudo chown -R n8n-mcp:n8n-mcp /opt/n8n-mcp
sudo chmod 600 /opt/n8n-mcp/.env
```

### Authentication Failures

**With Google Secrets Manager:**

```bash
# Test secret access
gcloud secrets versions access latest --secret="n8n-mcp-auth-token" --project="abound-infr"

# If access denied, check IAM permissions
gcloud secrets get-iam-policy n8n-mcp-auth-token --project="abound-infr"

# Test with correct token
TOKEN=$(gcloud secrets versions access latest --secret="n8n-mcp-auth-token" --project="abound-infr")
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/health

# Check logs for auth failures
sudo journalctl -u n8n-mcp | grep "Authentication failed"
```

**With .env File:**

```bash
# Check token in .env
sudo cat /opt/n8n-mcp/.env | grep AUTH_TOKEN

# Test with correct token
curl -H "Authorization: Bearer CORRECT_TOKEN" \
     http://localhost:3000/health

# Check logs for auth failures
sudo journalctl -u n8n-mcp | grep "Authentication failed"
```

### Can't Connect from Claude Desktop

1. **Check URL is accessible:**
   ```bash
   curl https://n8n-mcp.your-domain.com/health
   ```

2. **Verify SSL certificate:**
   ```bash
   curl -v https://n8n-mcp.your-domain.com/health 2>&1 | grep "SSL"
   ```

3. **Check token is correct** in Claude Desktop connector settings

4. **Restart Claude Desktop** after changing connector settings

### n8n API Not Working

**With Google Secrets Manager:**

```bash
# Get API key from secrets
N8N_KEY=$(gcloud secrets versions access latest --secret="n8n-mcp-n8n-api-key" --project="abound-infr")

# Test n8n API connection
curl http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: $N8N_KEY"

# Check logs for n8n API errors
sudo journalctl -u n8n-mcp | grep "n8n API"
```

**With .env File:**

```bash
# Test n8n API connection
curl http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: YOUR_N8N_API_KEY"

# Check logs for n8n API errors
sudo journalctl -u n8n-mcp | grep "n8n API"

# Verify N8N_API_URL and N8N_API_KEY in .env
sudo cat /opt/n8n-mcp/.env | grep N8N_API
```

## 📈 Performance Optimization

### Co-location Benefits

Since n8n-mcp is on the same VM as n8n:
- **Latency**: < 1ms for n8n API calls (localhost)
- **Bandwidth**: No network egress costs
- **Security**: API calls never leave the VM

### Resource Allocation

Current limits (adjust as needed):
```ini
MemoryLimit=512M
CPUQuota=50%
```

To increase:
```bash
sudo nano /etc/systemd/system/n8n-mcp.service
# Change limits
sudo systemctl daemon-reload
sudo systemctl restart n8n-mcp
```

## ✅ Deployment Verification Checklist

- [ ] Service running: `sudo systemctl status n8n-mcp`
- [ ] Health endpoint works: `curl https://n8n-mcp.your-domain.com/health`
- [ ] MCP endpoint works with auth
- [ ] SSL certificate valid
- [ ] Firewall configured
- [ ] Authentication token secure (32+ chars)
- [ ] n8n API connection working
- [ ] Claude Desktop connector added
- [ ] Logs showing no errors
- [ ] Service starts on boot

## 🎉 Success!

Your n8n-MCP server is now deployed and ready to use with:
- ✅ Claude Desktop (via Custom Connectors)
- ✅ ChatGPT (Pro/Business/Enterprise/Edu)
- ✅ Cursor IDE
- ✅ Claude Code (VSCode)
- ✅ Windsurf
- ✅ Any other MCP-compatible client

**No credentials stored in config files** - all authentication happens via the UI! 🔒

### What You Get

With all 58 MCP tools available, you can now:
- 📚 Ask about any of 535+ n8n nodes
- 🔍 Search and validate node configurations
- 🤖 Get AI-powered workflow suggestions
- ⚙️ Create and manage n8n workflows directly
- 🔧 Validate workflows before deployment
- 📊 Access 2,598 workflow templates
- 🚀 Execute workflows via webhooks

All from your favorite AI assistant! 🎉
