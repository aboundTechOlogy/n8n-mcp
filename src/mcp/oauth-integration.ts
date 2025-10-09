import express from 'express';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { N8nMcpOAuthProvider } from './oauth-provider.js';
import { logger } from '../utils/logger.js';

export interface OAuthIntegrationOptions {
  issuerUrl: string;
  enableOAuth: boolean;
}

export function setupOAuthRoutes(app: express.Application, options: OAuthIntegrationOptions): N8nMcpOAuthProvider | null {
  if (!options.enableOAuth) {
    logger.info('OAuth disabled - using Bearer token authentication only');
    return null;
  }

  logger.info('Setting up OAuth 2.0 with Dynamic Client Registration');

  const provider = new N8nMcpOAuthProvider();

  try {
    const issuerUrl = new URL(options.issuerUrl);

    // Add MCP OAuth routes
    app.use(mcpAuthRouter({
      provider,
      issuerUrl,
      scopesSupported: ['mcp:tools', 'mcp:read', 'mcp:write'],
      resourceName: 'n8n-MCP Server',
    }));

    logger.info('OAuth 2.0 endpoints configured', {
      issuer: issuerUrl.toString(),
      endpoints: {
        metadata: '/.well-known/oauth-authorization-server',
        register: '/oauth/register',
        authorize: '/oauth/authorize',
        token: '/oauth/token',
        revoke: '/oauth/revoke'
      }
    });

    return provider;
  } catch (error) {
    logger.error('Failed to setup OAuth routes', error);
    throw error;
  }
}

export function createOAuthAuthenticationMiddleware(provider: N8nMcpOAuthProvider | null, bearerToken: string) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.get('authorization');

    if (!authHeader) {
      logger.warn('Authentication failed: Missing Authorization header');
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Unauthorized'
        },
        id: null
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Invalid Authorization header format');
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Unauthorized'
        },
        id: null
      });
      return;
    }

    const token = authHeader.slice(7).trim();

    // Try OAuth token first if OAuth is enabled
    if (provider) {
      try {
        const tokenInfo = await provider.verifyAccessToken(token);
        logger.debug('OAuth token verified', { clientId: tokenInfo.clientId });
        // Attach token info to request for downstream use
        (req as any).oauthTokenInfo = tokenInfo;
        next();
        return;
      } catch (oauthError) {
        logger.debug('OAuth token verification failed, trying bearer token');
      }
    }

    // Fall back to static bearer token
    if (token === bearerToken) {
      logger.debug('Bearer token verified');
      next();
      return;
    }

    logger.warn('Authentication failed: Invalid token');
    res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Unauthorized'
      },
      id: null
    });
  };
}
