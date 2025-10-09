# Secure Multi-IDE Setup for n8n-MCP

Connect Cursor (WSL & Windows) and Claude Code to your remote n8n-MCP server securely.

## ✅ What's Working

- ✅ **Claude Desktop** - OAuth authentication (GCP server)
- ✅ **Claude Code WSL** - Local n8n-mcp server via stdio
- ✅ **Claude Code Windows** - GCP server via stdio bridge
- ✅ **Cursor WSL** - Direct HTTP with bearer token (GCP server)
- ✅ **Cursor Windows** - Direct HTTP with bearer token (GCP server)

## 🔧 Cursor WSL Setup (Already Done)

Created `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "url": "https://n8n-mcp.aboundtechology.com/mcp",
      "transport": {
        "type": "http",
        "headers": {
          "Authorization": "Bearer 7vhfwUdE2fPpkoganiufeuuAs2G9+S7N8IAW78Jxtl8="
        }
      }
    }
  }
}
```

**Note:** No environment variables needed - direct HTTP connection works!

## 🔧 Cursor Windows Setup

Create `C:\Users\<YourUsername>\.cursor\mcp.json`:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "url": "https://n8n-mcp.aboundtechology.com/mcp",
      "transport": {
        "type": "http",
        "headers": {
          "Authorization": "Bearer 7vhfwUdE2fPpkoganiufeuuAs2G9+S7N8IAW78Jxtl8="
        }
      }
    }
  }
}
```

Then restart Cursor Windows.

## 🔧 Claude Code Setup

### Claude Code WSL
Uses local n8n-mcp server via `claude mcp` CLI:
```bash
claude mcp list
# Shows: n8n-mcp-enhanced: node /home/dreww/n8n-mcp/dist/mcp/index.js - ✓ Connected
```

### Claude Code Windows (via Bridge Script)

Since Claude Code only supports stdio/SSE MCP servers (not HTTP with bearer tokens), we use a bridge script.

**Bridge script location:** `C:\Users\dreww\n8n-mcp-bridge.js`

**Configuration:**
```powershell
# Add bridge to Claude Code
claude mcp add n8n-mcp-gcp node C:\Users\dreww\n8n-mcp-bridge.js

# Verify connection
claude mcp list
# Should show: n8n-mcp-gcp: node C:\Users\dreww\n8n-mcp-bridge.js - ✓ Connected
```

**Important:** After connecting, restart Cursor Windows or start a new Claude Code chat session to load the 58 tools.

## ✅ Testing Connections

**Test Cursor WSL:**
1. Open Cursor in WSL: `cursor .`
2. Check MCP settings/panel for "n8n-mcp"
3. Should show 58 tools available
4. Try asking: "List available n8n nodes"

**Test Cursor Windows:**
1. Open Cursor on Windows
2. Check MCP settings/panel for "n8n-mcp"
3. Should show 58 tools available
4. Try asking: "Show me the Slack node"

**Test Claude Code:**
1. Open Claude Code extension
2. Verify tools are available (shares OAuth with Claude Desktop)
3. Try asking: "What n8n nodes are available?"

## 🔒 Security Summary

| Environment | Method | Security |
|-------------|--------|----------|
| **Claude Desktop** | OAuth | ✅ Best - No credentials in files |
| **Claude Code** | OAuth | ✅ Best - Shared with Desktop |
| **Cursor WSL** | Bearer Token | ⚠️ Token in user config (gitignored) |
| **Cursor Windows** | Bearer Token | ⚠️ Token in user config (gitignored) |

### Security Notes:
- ✅ OAuth used where supported (Claude Desktop/Code)
- ⚠️ Cursor uses bearer token in `~/.cursor/mcp.json` (user-level, not project)
- ✅ User-level config is NOT tracked in git
- ✅ Direct HTTPS connection (no proxy needed)
- 🔄 Rotate bearer tokens regularly for production use

## 🔧 Troubleshooting

### Cursor: "n8n-mcp" not found or red dot

1. Verify `~/.cursor/mcp.json` exists and is valid JSON
2. Restart Cursor completely (close all windows)
3. Check MCP panel shows "n8n-mcp" (not "n8n-mcp-remote")
4. Red dot is normal - tools should still work if 58 tools are listed

### Cursor: "Connection failed" or "Unauthorized"

1. Verify your GCP server is running:
   ```bash
   curl -H "Authorization: Bearer 7vhfwUdE2fPpkoganiufeuuAs2G9+S7N8IAW78Jxtl8=" \
     https://n8n-mcp.aboundtechology.com/health
   ```

2. Check the token matches exactly (no extra spaces)

3. Look at Cursor logs: Help → Toggle Developer Tools → Console

### Claude Code: "No tools available"

1. Make sure Claude Desktop is configured and connected first
2. Restart VS Code/Cursor
3. Check Claude Desktop config file exists:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

## 📊 Connection Architecture

```
┌─────────────────────┐
│  Claude Desktop     │ ──OAuth───────> GCP Server (HTTPS)
│  (Native OAuth)     │                 https://n8n-mcp.aboundtechology.com
└─────────────────────┘                 ↑
                                        │
┌─────────────────────┐                 │
│  Claude Code        │ ──OAuth─────────┤
│  (Shared with Desktop)                │
└─────────────────────┘                 │
                                        │
┌─────────────────────┐                 │
│  Cursor WSL         │ ──Bearer Token──┤
│  (Direct HTTP)      │                 │
└─────────────────────┘                 │
                                        │
┌─────────────────────┐                 │
│  Cursor Windows     │ ──Bearer Token──┤
│  (Direct HTTP)      │                 │
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
