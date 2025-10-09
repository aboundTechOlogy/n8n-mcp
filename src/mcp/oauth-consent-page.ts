import { Request, Response } from 'express';

export function renderConsentPage(req: Request, res: Response, params: {
  clientName: string;
  scopes: string[];
  redirectUrl: string;
}): void {
  const { clientName, scopes, redirectUrl } = params;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize Access - n8n-MCP</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      max-width: 500px;
      width: 100%;
      padding: 40px;
    }

    .logo {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo h1 {
      color: #667eea;
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .logo p {
      color: #6b7280;
      font-size: 14px;
    }

    .client-info {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .client-info h2 {
      font-size: 16px;
      color: #1f2937;
      margin-bottom: 8px;
    }

    .client-info p {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.5;
    }

    .permissions {
      margin-bottom: 32px;
    }

    .permissions h3 {
      font-size: 14px;
      color: #1f2937;
      margin-bottom: 12px;
      font-weight: 600;
    }

    .permissions ul {
      list-style: none;
    }

    .permissions li {
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
      color: #4b5563;
      font-size: 14px;
    }

    .permissions li:last-child {
      border-bottom: none;
    }

    .permissions li::before {
      content: "✓ ";
      color: #10b981;
      font-weight: bold;
      margin-right: 8px;
    }

    .actions {
      display: flex;
      gap: 12px;
    }

    button {
      flex: 1;
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .approve {
      background: #667eea;
      color: white;
    }

    .approve:hover {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .deny {
      background: #e5e7eb;
      color: #6b7280;
    }

    .deny:hover {
      background: #d1d5db;
    }

    .security-note {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>n8n-MCP Server</h1>
      <p>Workflow Automation Documentation</p>
    </div>

    <div class="client-info">
      <h2>${escapeHtml(clientName)}</h2>
      <p>wants to access your n8n-MCP server with the following permissions:</p>
    </div>

    <div class="permissions">
      <h3>This will allow the application to:</h3>
      <ul>
        ${scopes.map(scope => `<li>${getScopeDescription(scope)}</li>`).join('')}
      </ul>
    </div>

    <form method="POST" action="${escapeHtml(redirectUrl)}" class="actions">
      <button type="submit" name="action" value="approve" class="approve">
        Authorize
      </button>
      <button type="submit" name="action" value="deny" class="deny">
        Cancel
      </button>
    </form>

    <div class="security-note">
      🔒 This is a secure OAuth 2.0 authorization request
    </div>
  </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getScopeDescription(scope: string): string {
  const descriptions: Record<string, string> = {
    'mcp:tools': 'Access all 58 n8n documentation and workflow management tools',
    'mcp:read': 'Read n8n node documentation and workflow information',
    'mcp:write': 'Create and modify n8n workflows'
  };

  return descriptions[scope] || scope;
}
