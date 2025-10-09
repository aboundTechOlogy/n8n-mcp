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

```bash
# Connect to your GCP VM
gcloud compute ssh your-vm-name --zone=your-zone

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install additional tools
sudo apt-get install -y git curl nginx certbot python3-certbot-nginx

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

### Step 3: Generate Secure Authentication Token

```bash
# Generate a secure 32-character token
openssl rand -base64 32

# SAVE THIS TOKEN - You'll need it for:
# 1. Server configuration (.env file)
# 2. Claude Desktop connector setup
# 3. Cursor/Claude Code configuration
```

**⚠️ CRITICAL**: Save this token in your password manager. You'll configure it:
- **Server-side**: In the `.env` file on the VM
- **Client-side**: In Claude Desktop/Cursor UI (NOT in config files)

### Step 4: Server Configuration

```bash
# Create environment configuration
sudo nano /opt/n8n-mcp/.env
```

**Paste this configuration** (replace placeholder values):

```bash
# ==================
# CORE CONFIGURATION
# ==================

# Server Mode
MCP_MODE=http
USE_FIXED_HTTP=true
NODE_ENV=production

# Network Settings
PORT=3000
HOST=0.0.0.0

# Database
NODE_DB_PATH=/opt/n8n-mcp/data/nodes.db

# Logging
LOG_LEVEL=info

# ==================
# AUTHENTICATION
# ==================

# Bearer token for HTTP authentication
# PASTE YOUR TOKEN FROM STEP 3 HERE
AUTH_TOKEN=<PASTE_YOUR_GENERATED_TOKEN_HERE>

# ==================
# N8N API INTEGRATION
# ==================

# Your n8n instance (use localhost since on same VM)
N8N_API_URL=http://localhost:5678

# Your n8n API key (get from n8n Settings > API)
N8N_API_KEY=<YOUR_N8N_API_KEY>

# API Timeout (optional)
N8N_API_TIMEOUT=30000
N8N_API_MAX_RETRIES=3

# ==================
# REVERSE PROXY
# ==================

# Your public domain
BASE_URL=https://n8n-mcp.your-domain.com

# Trust proxy for correct IP logging
TRUST_PROXY=1

# CORS (optional - restrict for production)
# CORS_ORIGIN=https://claude.ai
```

**Get your n8n API Key:**
```bash
# 1. Open your n8n instance in browser
# 2. Go to Settings > API
# 3. Click "Create API Key"
# 4. Copy the key and paste it in .env above
```

**Save and exit**: `Ctrl+X`, then `Y`, then `Enter`

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

# Start command
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

### Claude Desktop (Custom Connectors)

**IMPORTANT**: Do NOT edit `claude_desktop_config.json`. Use the UI instead.

1. Open Claude Desktop
2. Go to **Settings** > **Connectors**
3. Click **Add Connector**
4. Select **Custom Connector** type
5. Fill in the form:
   - **Name**: `n8n-mcp` (or any name you prefer)
   - **Type**: `url`
   - **URL**: `https://n8n-mcp.your-domain.com/mcp`
   - **Authorization Token**: Paste your token from Step 3
6. Click **Save**
7. Restart Claude Desktop

The connector will now appear in your Claude conversations!

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

**Available for**: ChatGPT Pro, Business, Enterprise, and Edu users

1. Open ChatGPT (web or desktop app)
2. Go to **Settings** > **Connectors**
3. Click **Add Connector** or **+ New Connector**
4. Select **Custom Connector** type
5. Fill in the form:
   - **Name**: `n8n-mcp` (or any name you prefer)
   - **Type**: `Remote MCP` or `URL`
   - **MCP URL**: `https://n8n-mcp.your-domain.com/mcp`
   - **Authorization Token**: Paste your token from Step 3
   - **Icon** (optional): Upload a custom icon
6. Click **Save**
7. The connector will appear in your ChatGPT conversations

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

When rotating tokens:

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
# - Missing AUTH_TOKEN in .env
# - Port 3000 already in use
# - Database file missing
# - Incorrect permissions

# Fix permissions
sudo chown -R n8n-mcp:n8n-mcp /opt/n8n-mcp
sudo chmod 600 /opt/n8n-mcp/.env
```

### Authentication Failures

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
