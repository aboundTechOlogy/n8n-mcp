# Windows Bridge for Claude Code Extension

⚠️ **DEPRECATED** - This bridge script is no longer needed as of Claude Code June 2025 update.

## 🆕 Recommended Alternative (HTTP Transport)

Claude Code now supports HTTP transport directly. Use this instead:

```powershell
# Add n8n-mcp server via HTTP transport
claude mcp add -t http n8n-mcp-gcp https://n8n-mcp.aboundtechology.com/mcp -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Verify connection
claude mcp list
# Should show: n8n-mcp-gcp: https://n8n-mcp.aboundtechology.com/mcp (HTTP) - ✓ Connected
```

**Benefits of HTTP Transport:**
- ✅ No bridge script needed
- ✅ Simpler configuration
- ✅ Native Claude Code feature
- ✅ Better error handling
- ✅ No additional Node.js process

See [SECURE_MULTI_IDE_SETUP.md](../SECURE_MULTI_IDE_SETUP.md) for complete setup instructions.

---

## 📚 Legacy Documentation

This bridge script was created before Claude Code's HTTP transport feature was widely known. It still works but is no longer the recommended approach.

### Why was this needed?

Claude Code extension previously appeared to only support stdio and SSE MCP server transports. This bridge converted stdio requests to HTTPS requests with proper authentication.

### Migration to HTTP Transport

If you're currently using this bridge script:

```powershell
# Remove old bridge configuration
claude mcp remove n8n-mcp-gcp

# Add using HTTP transport
claude mcp add -t http n8n-mcp-gcp https://n8n-mcp.aboundtechology.com/mcp -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Verify it works
claude mcp list
```

---

## Legacy Installation Instructions

## Installation

1. Copy `n8n-mcp-bridge.js` to your Windows user directory:
   ```
   C:\Users\<YourUsername>\n8n-mcp-bridge.js
   ```

2. Edit the file and update these values:
   - `REMOTE_SERVER`: Your n8n-MCP server URL
   - `AUTH_TOKEN`: Your server's bearer token

3. Add the bridge to Claude Code:
   ```powershell
   claude mcp add n8n-mcp-gcp node C:\Users\<YourUsername>\n8n-mcp-bridge.js
   ```

4. Verify it's connected:
   ```powershell
   claude mcp list
   ```
   Should show: `n8n-mcp-gcp: node C:\Users\...\n8n-mcp-bridge.js - ✓ Connected`

5. Restart Cursor Windows or start a new Claude Code chat session

## Troubleshooting

### Check the log file
The bridge logs to `C:\Users\<YourUsername>\n8n-mcp-bridge.log`

View the log:
```powershell
type $env:USERPROFILE\n8n-mcp-bridge.log
```

### Test manually
```powershell
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}' | node C:\Users\<YourUsername>\n8n-mcp-bridge.js
```

Should return server info with all available tools.

### Common issues

**"Failed to parse response: Unexpected token"**
- The bridge couldn't parse the server's SSE response
- Check if the server URL is correct

**"Not Acceptable: Client must accept both application/json and text/event-stream"**
- The Accept header is missing
- This is already fixed in the current version

**"Connection refused"**
- Server is not running or not accessible
- Check if the server URL is correct
- Verify the server is running: `curl -H "Authorization: Bearer YOUR_TOKEN" https://your-server.com/health`

## How it works

```
Claude Code Extension (stdio)
    ↓
Bridge Script (stdio → HTTPS)
    ↓
n8n-MCP GCP Server (HTTPS + Bearer Token)
```

The bridge:
1. Listens on stdin for JSON-RPC messages from Claude Code
2. Forwards each request to the remote server via HTTPS POST
3. Handles SSE format responses from the server
4. Returns JSON-RPC responses to Claude Code via stdout
