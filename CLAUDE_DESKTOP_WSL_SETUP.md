# Claude Desktop Setup for n8n-mcp on WSL

## Problem
When running n8n-mcp from Windows Claude Desktop while the code is in WSL, the server may fail to find the database or have path resolution issues.

## Root Cause
- Claude Desktop runs on Windows
- n8n-mcp code is in WSL filesystem
- `process.cwd()` differs when called from Windows vs inside WSL
- Database path resolution fails when working directory is not the project root

## Solution

### Option 1: Recommended Configuration (Using wsl.exe)

Edit your `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "wsl.exe",
      "args": [
        "-d", "Ubuntu",
        "-e", "bash", "-c",
        "cd /home/dreww/n8n-mcp && node dist/mcp/index.js"
      ],
      "env": {
        "NODE_DB_PATH": "/home/dreww/n8n-mcp/data/nodes.db"
      }
    }
  }
}
```

**Key points:**
- Uses `bash -c "cd ... && node ..."` to ensure correct working directory
- Explicitly sets `NODE_DB_PATH` to the database location
- Replace `Ubuntu` with your WSL distribution name if different
- Replace `/home/dreww/n8n-mcp` with your actual path

### Option 2: Using NPX (Simpler)

If you've installed n8n-mcp globally or want to use npx:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "wsl.exe",
      "args": [
        "-d", "Ubuntu",
        "-e", "bash", "-c",
        "cd /home/dreww/n8n-mcp && npx n8n-mcp"
      ]
    }
  }
}
```

### Option 3: Direct Node Execution (If database path is reliable)

After the latest fix (v2.14.2+), the server should auto-detect the database:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "wsl.exe",
      "args": [
        "-d", "Ubuntu",
        "-e", "node",
        "/home/dreww/n8n-mcp/dist/mcp/index.js"
      ]
    }
  }
}
```

## Verification Steps

1. **Build the project:**
   ```bash
   cd /home/dreww/n8n-mcp
   npm run build
   ```

2. **Verify database exists:**
   ```bash
   ls -lh /home/dreww/n8n-mcp/data/nodes.db
   ```
   Should show ~50MB file

3. **Test the server manually:**
   ```bash
   cd /home/dreww/n8n-mcp
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/mcp/index.js
   ```
   Should return initialization response

4. **Reload Claude Desktop:**
   - Close Claude Desktop completely
   - Reopen it
   - The MCP server should now connect successfully

## Troubleshooting

### Error: "Database nodes.db not found"

**Check database exists:**
```bash
wsl.exe -d Ubuntu -e ls -lh /home/dreww/n8n-mcp/data/nodes.db
```

**Rebuild database:**
```bash
wsl.exe -d Ubuntu -e bash -c "cd /home/dreww/n8n-mcp && npm run rebuild"
```

### Error: "Cannot read properties of undefined"

This usually means the server started but database path was wrong. The latest code (after this fix) provides better error messages showing which paths were checked.

**Check logs:**
- Windows: `%APPDATA%\Claude\logs\mcp-server-n8n-mcp.log`
- Look for "Found database at:" or "Database not found in any of the expected locations"

### Server Doesn't Start

**Test manually from Windows PowerShell:**
```powershell
wsl.exe -d Ubuntu -e bash -c "cd /home/dreww/n8n-mcp && node dist/mcp/index.js"
```

**Check WSL distribution name:**
```powershell
wsl.exe --list
```

### Tools Return Errors After Server Starts

If the server connects but tools fail:

1. **Verify you've built after pulling latest code:**
   ```bash
   cd /home/dreww/n8n-mcp
   git pull
   npm install
   npm run build
   ```

2. **Check the server version in Claude Desktop:**
   Call the `get_database_statistics` tool - it should work and show stats

3. **Test a simple tool:**
   Try `list_ai_tools` - if this works, other tools should too

## Path Translation Notes

When working with WSL from Windows:

- **WSL path:** `/home/dreww/n8n-mcp/data/nodes.db`
- **Windows path:** `\\wsl.localhost\Ubuntu\home\dreww\n8n-mcp\data\nodes.db`
- **In config:** Always use WSL paths (they work inside WSL)
- **Don't use:** Windows paths in the config - they won't work inside WSL

## What Changed in the Fix

The database path resolution now:

1. **Prioritizes `__dirname`-based paths** (most reliable across platforms)
2. **Adds WSL absolute path fallback**
3. **Provides detailed error messages** showing all paths checked
4. **Logs the working directory** to help debug path issues

This ensures the server works whether started from:
- WSL shell directly
- Windows via `wsl.exe`
- Claude Desktop
- npm scripts
- Node.js directly

## For n8n API Tools

If using n8n workflow management tools, also set:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "wsl.exe",
      "args": [
        "-d", "Ubuntu",
        "-e", "bash", "-c",
        "cd /home/dreww/n8n-mcp && node dist/mcp/index.js"
      ],
      "env": {
        "NODE_DB_PATH": "/home/dreww/n8n-mcp/data/nodes.db",
        "N8N_API_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```
