#!/usr/bin/env node
/**
 * MCP Bridge for Claude Code - Connects stdio to remote HTTP server
 * Bridges Claude Code extension to n8n-MCP GCP server
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const REMOTE_SERVER = 'https://n8n-mcp.aboundtechology.com/mcp';
const AUTH_TOKEN = '7vhfwUdE2fPpkoganiufeuuAs2G9+S7N8IAW78Jxtl8=';
const LOG_FILE = path.join(require('os').homedir(), 'n8n-mcp-bridge.log');

function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `${timestamp} - ${message}\n`);
}

let buffer = '';
let sessionId = null; // Track session ID from server

log('Bridge started');

// Read from stdin (Claude Code)
process.stdin.on('data', async (chunk) => {
  buffer += chunk.toString();

  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;

    let request;
    try {
      request = JSON.parse(line);
      log(`Request: ${request.method} (id: ${request.id})`);
      const response = await forwardToRemote(request);
      log(`Response: ${JSON.stringify(response).substring(0, 100)}`);
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (error) {
      log(`Error: ${error.message}`);
      const errorResponse = {
        jsonrpc: '2.0',
        error: { code: -32603, message: error.message },
        id: request?.id || null
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  }
});

async function forwardToRemote(request) {
  return new Promise((resolve, reject) => {
    const url = new URL(REMOTE_SERVER);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    };

    // Add session ID if we have one
    if (sessionId) {
      options.headers['Mcp-Session-Id'] = sessionId;
      log(`Using session ID: ${sessionId.substring(0, 8)}...`);
    }

    const req = https.request(options, (res) => {
      // Capture session ID from response headers
      const newSessionId = res.headers['mcp-session-id'];
      if (newSessionId && newSessionId !== sessionId) {
        sessionId = newSessionId;
        log(`Received new session ID: ${sessionId.substring(0, 8)}...`);
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          // Handle SSE format: "event: message\ndata: {...}\n\n"
          if (data.startsWith('event:')) {
            const lines = data.split('\n');
            const dataLine = lines.find(line => line.startsWith('data:'));
            if (dataLine) {
              const jsonData = dataLine.substring(5).trim(); // Remove "data:" prefix
              resolve(JSON.parse(jsonData));
            } else {
              reject(new Error('No data line found in SSE response'));
            }
          } else {
            // Plain JSON response
            resolve(JSON.parse(data));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(request));
    req.end();
  });
}

process.stdin.resume();
