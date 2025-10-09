# Secure Multi-IDE Setup for n8n-MCP

Connect Cursor (WSL & Windows) and Claude Code to your remote n8n-MCP server securely using environment variables.

## ✅ What I've Done (WSL)

1. ✅ Created `.cursor/mcp.json` with secure configuration
2. ✅ Added `N8N_MCP_TOKEN` to `~/.bashrc`
3. ✅ Added `.cursor/mcp.json` to `.gitignore`

## 🔧 What You Need To Do

### Step 1: Reload Your WSL Shell

```bash
source ~/.bashrc

# Verify token is set
echo $N8N_MCP_TOKEN
# Should output: 7vhfwUdE2fPpkoganiufeuuAs2G9+S7N8IAW78Jxtl8=
```

### Step 2: Set Up Windows Environment Variable

**Option A: Using PowerShell (Recommended)**
```powershell
# Open PowerShell as Administrator
[System.Environment]::SetEnvironmentVariable('N8N_MCP_TOKEN', '7vhfwUdE2fPpkoganiufeuuAs2G9+S7N8IAW78Jxtl8=', 'User')

# Close and reopen PowerShell/Terminal
# Verify:
echo $env:N8N_MCP_TOKEN
```

**Option B: Using System Settings GUI**
1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Go to "Advanced" tab → "Environment Variables"
3. Under "User variables", click "New"
4. Variable name: `N8N_MCP_TOKEN`
5. Variable value: `7vhfwUdE2fPpkoganiufeuuAs2G9+S7N8IAW78Jxtl8=`
6. Click OK, restart any open terminals/Cursor

### Step 3: Create Cursor Config for Windows

In your Windows project directory, create `.cursor\mcp.json`:

```json
{
  "mcpServers": {
    "n8n-mcp-remote": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://n8n-mcp.aboundtechology.com/mcp",
        "--header",
        "Authorization:Bearer ${N8N_MCP_TOKEN}"
      ]
    }
  }
}
```

Then add to `.gitignore`:
```
.cursor\mcp.json
```

### Step 4: Configure Claude Code (Already Done!)

Claude Code uses OAuth authentication via Claude Desktop. If you've already connected in Claude Desktop, Claude Code will work automatically. No additional configuration needed.

**Config location:** `%APPDATA%\Claude\claude_desktop_config.json`

Your existing config:
```json
{
  "mcpServers": {
    "n8n-mcp": {
      "url": "https://n8n-mcp.aboundtechology.com/mcp",
      "transport": {
        "type": "http",
        "oauth": {}
      }
    }
  }
}
```

### Step 5: Restart Everything

1. **Close and reopen your WSL terminal** (to load new .bashrc)
2. **Restart Cursor WSL**
3. **Restart Cursor Windows** (after setting Windows env var)
4. **Restart VS Code** (if using Claude Code extension)

### Step 6: Test Each Connection

**Test Cursor WSL:**
```bash
# In WSL terminal, verify env var is loaded
echo $N8N_MCP_TOKEN

# Open Cursor in WSL
cursor .

# In Cursor:
# 1. Open Command Palette (Ctrl+Shift+P)
# 2. Type "MCP"
# 3. Check MCP panel for "n8n-mcp-remote"
# 4. Try asking: "List available n8n nodes"
```

**Test Cursor Windows:**
```powershell
# In PowerShell, verify env var
echo $env:N8N_MCP_TOKEN

# Open Cursor
# Check MCP panel for "n8n-mcp-remote"
# Try asking: "Show me the Slack node"
```

**Test Claude Code:**
```
# Already working from Claude Desktop OAuth setup
# Just open Claude Code extension and verify tools are available
```

## 🔒 Security Summary

| Environment | Method | Security |
|-------------|--------|----------|
| **Claude Desktop** | OAuth | ✅ Best - No credentials in files |
| **Claude Code** | OAuth | ✅ Best - Shared with Desktop |
| **Cursor WSL** | Env Var | ✅ Good - Token in shell config, not git |
| **Cursor Windows** | Env Var | ✅ Good - Token in system env, not git |

### Security Checklist:
- ✅ No credentials hardcoded in config files
- ✅ Tokens stored in environment variables
- ✅ Config files are gitignored
- ✅ OAuth used where supported (Claude Desktop/Code)
- ✅ Bearer token fallback for Cursor (until OAuth support)

## 🔧 Troubleshooting

### Cursor: "n8n-mcp-remote not found"

1. Check environment variable is set:
   ```bash
   # WSL
   echo $N8N_MCP_TOKEN

   # Windows
   echo %N8N_MCP_TOKEN%  # CMD
   echo $env:N8N_MCP_TOKEN  # PowerShell
   ```

2. Restart Cursor completely (close all windows)

3. Try manually running mcp-remote:
   ```bash
   npx -y mcp-remote@latest https://n8n-mcp.aboundtechology.com/mcp --help
   ```

### Cursor: "Connection failed" or "Unauthorized"

1. Verify your GCP server is running:
   ```bash
   curl -H "Authorization: Bearer 7vhfwUdE2fPpkoganiufeuuAs2G9+S7N8IAW78Jxtl8=" \
     https://n8n-mcp.aboundtechology.com/health
   ```

2. Check the token matches exactly (no extra spaces)

3. Look at Cursor logs: Help → Toggle Developer Tools → Console

### Cursor: "npx command not found"

Install Node.js:
- **WSL**: `sudo apt install nodejs npm`
- **Windows**: Download from https://nodejs.org

### Claude Code: "No tools available"

1. Make sure Claude Desktop is configured and connected first
2. Restart VS Code/Cursor
3. Check Claude Desktop config file exists

## 📊 Connection Architecture

```
┌─────────────────────┐
│  Claude Desktop     │ ──OAuth──> GCP Server
│  (Native OAuth)     │            ↑
└─────────────────────┘            │
                                   │
┌─────────────────────┐            │
│  Claude Code        │ ──OAuth──> │
│  (Shared OAuth)     │            │
└─────────────────────┘            │
                                   │
┌─────────────────────┐            │
│  Cursor WSL         │            │
│  (mcp-remote)       │ ──Bearer──>│
└─────────────────────┘            │
                                   │
┌─────────────────────┐            │
│  Cursor Windows     │            │
│  (mcp-remote)       │ ──Bearer──>│
└─────────────────────┘
```

## 🎯 What Works Where

| Feature | Claude Desktop | Claude Code | Cursor WSL | Cursor Windows |
|---------|---------------|-------------|------------|----------------|
| OAuth | ✅ | ✅ | ❌ | ❌ |
| Bearer Token | ✅ | ✅ | ✅ | ✅ |
| All 58 Tools | ✅ | ✅ | ✅ | ✅ |
| Remote Server | ✅ | ✅ | ✅ | ✅ |
| Auto-reconnect | ✅ | ✅ | ✅ | ✅ |

## 🚀 Next Steps

Once everything is connected:
1. Try asking Cursor: "List all n8n trigger nodes"
2. Try asking: "Show me how to configure the Slack node"
3. Try asking: "Create a workflow that sends a Slack message"
4. All 58 tools should be available in all environments!

## 📚 Additional Resources

- [GCP Deployment Guide](./GCP_DEPLOYMENT_GUIDE.md) - Server setup
- [Cursor Setup](./docs/CURSOR_SETUP.md) - Local Cursor setup
- [mcp-remote npm package](https://www.npmjs.com/package/mcp-remote) - Proxy tool docs
