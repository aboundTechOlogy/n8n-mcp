# Migration Guide: Bridge Script → HTTP Transport

This guide helps you migrate from the legacy bridge script to Claude Code's native HTTP transport.

## Why Migrate?

**HTTP Transport Benefits:**
- ✅ **Simpler** - No bridge script to maintain
- ✅ **Native** - Built-in Claude Code feature
- ✅ **Faster** - Direct connection, no intermediary
- ✅ **Reliable** - Better error handling
- ✅ **Cleaner** - One less Node.js process running

**Bridge Script Drawbacks:**
- ❌ Additional script to manage
- ❌ Extra Node.js process
- ❌ More complex troubleshooting
- ❌ Custom error handling needed
- ❌ Session tracking complexity

## Before You Start

**What you need:**
- Claude Code (Cursor Windows with Claude Code extension)
- n8n-MCP server URL: `https://n8n-mcp.aboundtechology.com/mcp`
- Bearer token: Get from Google Secrets Manager

**Get your token:**
```powershell
# From Windows (if you have gcloud CLI)
gcloud secrets versions access latest --secret="n8n-mcp-auth-token" --project="abound-infr"

# Or get from WSL and copy
```

## Migration Steps

### Step 1: Remove Old Bridge Configuration

Open PowerShell in Windows:

```powershell
# List current MCP servers
claude mcp list

# Remove the bridge-based server
claude mcp remove n8n-mcp-gcp

# Verify it's removed
claude mcp list
```

### Step 2: Add HTTP Transport Configuration

```powershell
# Set token as environment variable (recommended)
$env:N8N_MCP_TOKEN = "7vhfwUdE2fPpkoganiufeuuAs2G9+S7N8IAW78Jxtl8="

# Add server using HTTP transport
claude mcp add -t http n8n-mcp-gcp https://n8n-mcp.aboundtechology.com/mcp -H "Authorization: Bearer $env:N8N_MCP_TOKEN"
```

**Alternative (token in command):**
```powershell
claude mcp add -t http n8n-mcp-gcp https://n8n-mcp.aboundtechology.com/mcp -H "Authorization: Bearer 7vhfwUdE2fPpkoganiufeuuAs2G9+S7N8IAW78Jxtl8="
```

### Step 3: Verify Connection

```powershell
# List servers
claude mcp list

# Should show:
# n8n-mcp-gcp: https://n8n-mcp.aboundtechology.com/mcp (HTTP) - ✓ Connected
```

### Step 4: Test in Cursor

1. Restart Cursor Windows (close all windows)
2. Open a new Claude Code chat
3. Verify 58 tools are available
4. Test with: "List all n8n trigger nodes"

### Step 5: Clean Up (Optional)

Remove the bridge script file:

```powershell
# Remove bridge script
Remove-Item C:\Users\$env:USERNAME\n8n-mcp-bridge.js -ErrorAction SilentlyContinue

# Remove log file
Remove-Item C:\Users\$env:USERNAME\n8n-mcp-bridge.log -ErrorAction SilentlyContinue
```

## Before and After Comparison

### Before (Bridge Script)

**Configuration:**
```powershell
claude mcp add n8n-mcp-gcp node C:\Users\dreww\n8n-mcp-bridge.js
```

**Architecture:**
```
Claude Code Extension (stdio)
    ↓
Bridge Script (Node.js process)
    ↓ HTTPS + Bearer Token
n8n-MCP Server
```

**Issues:**
- Bridge script must be maintained
- Two-step connection path
- Custom error handling in bridge
- Session tracking complexity
- Log file management

### After (HTTP Transport)

**Configuration:**
```powershell
claude mcp add -t http n8n-mcp-gcp https://n8n-mcp.aboundtechology.com/mcp -H "Authorization: Bearer $env:N8N_MCP_TOKEN"
```

**Architecture:**
```
Claude Code Extension
    ↓ HTTP Transport (native)
n8n-MCP Server
```

**Benefits:**
- Native Claude Code feature
- Direct connection
- Built-in error handling
- Simpler troubleshooting
- No extra processes

## Troubleshooting

### "Server not found" after adding

**Check URL is accessible:**
```powershell
curl -H "Authorization: Bearer YOUR_TOKEN" https://n8n-mcp.aboundtechology.com/health
```

Should return: `{"status":"ok",...}`

### "Authentication failed"

**Verify token:**
```powershell
# Test with curl
curl -H "Authorization: Bearer YOUR_TOKEN" https://n8n-mcp.aboundtechology.com/health
```

If this fails, the token is incorrect or expired.

### "Connection timeout"

**Check network:**
```powershell
# Test basic connectivity
Test-NetConnection n8n-mcp.aboundtechology.com -Port 443
```

### Tools not showing in Cursor

1. Restart Cursor completely (close all windows)
2. Start a new Claude Code chat
3. Wait 10-15 seconds for tools to load
4. Check with: `claude mcp list` in PowerShell

### Need to revert to bridge script?

If you need to go back temporarily:

```powershell
# Remove HTTP transport
claude mcp remove n8n-mcp-gcp

# Re-add bridge script
claude mcp add n8n-mcp-gcp node C:\Users\$env:USERNAME\n8n-mcp-bridge.js
```

But please report the issue so we can fix the HTTP transport setup!

## Environment Variable Setup (Recommended)

To avoid storing tokens in command history:

### PowerShell Profile (Persistent)

```powershell
# Edit your PowerShell profile
notepad $PROFILE

# Add this line:
$env:N8N_MCP_TOKEN = "7vhfwUdE2fPpkoganiufeuuAs2G9+S7N8IAW78Jxtl8="

# Save and reload
. $PROFILE
```

### Windows Environment Variables (System-wide)

1. Open System Properties → Environment Variables
2. Add User Variable:
   - Name: `N8N_MCP_TOKEN`
   - Value: `7vhfwUdE2fPpkoganiufeuuAs2G9+S7N8IAW78Jxtl8=`
3. Restart PowerShell

Then use:
```powershell
claude mcp add -t http n8n-mcp-gcp https://n8n-mcp.aboundtechology.com/mcp -H "Authorization: Bearer $env:N8N_MCP_TOKEN"
```

## Security Notes

**Bridge Script:**
- Token hardcoded in JavaScript file
- File must be protected with permissions
- Token visible in `claude mcp list` output

**HTTP Transport:**
- Token in environment variable (recommended)
- Or token in Claude Code config
- Same visibility in `claude mcp list` output

Both methods have similar security profiles. HTTP transport is cleaner and easier to manage.

## Success Checklist

- [ ] Old bridge configuration removed
- [ ] HTTP transport added
- [ ] Connection verified with `claude mcp list`
- [ ] Cursor restarted
- [ ] All 58 tools showing in Claude Code
- [ ] Test query successful
- [ ] Bridge script files deleted (optional)
- [ ] Token in environment variable (recommended)

## Questions?

See the main setup guide: [SECURE_MULTI_IDE_SETUP.md](./SECURE_MULTI_IDE_SETUP.md)

---

**Migration Date:** October 2025
**Claude Code Version:** June 2025+ with HTTP transport support
