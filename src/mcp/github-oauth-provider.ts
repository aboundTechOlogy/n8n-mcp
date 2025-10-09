import { randomUUID } from 'node:crypto';
import type { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import { Response } from 'express';
import { OAuthStorage } from './oauth-storage.js';
import { logger } from '../utils/logger.js';
import fetch from 'node-fetch';

interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
}

export class GitHubOAuthProvider implements OAuthServerProvider {
  private storage: OAuthStorage;
  private _clientsStore: OAuthRegisteredClientsStore;
  private githubClientId: string;
  private githubClientSecret: string;
  private baseUrl: string;

  constructor(config: {
    githubClientId: string;
    githubClientSecret: string;
    baseUrl: string;
    dbPath?: string;
  }) {
    this.githubClientId = config.githubClientId;
    this.githubClientSecret = config.githubClientSecret;
    this.baseUrl = config.baseUrl;
    this.storage = new OAuthStorage(config.dbPath);

    // For MCP, we still need a clients store for DCR
    this._clientsStore = {
      getClient: async (clientId: string) => this.storage.getClient(clientId),
      registerClient: async (client: OAuthClientInformationFull) => this.storage.registerClient(client)
    };

    // Cleanup expired tokens every hour
    setInterval(() => {
      const deletedTokens = this.storage.cleanupExpiredTokens();
      const deletedCodes = this.storage.cleanupExpiredCodes();
      if (deletedTokens > 0 || deletedCodes > 0) {
        logger.info('OAuth cleanup', { deletedTokens, deletedCodes });
      }
    }, 3600000);

    logger.info('GitHub OAuth provider initialized');
  }

  get clientsStore(): OAuthRegisteredClientsStore {
    return this._clientsStore;
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: {
      redirectUri: string;
      scopes?: string[];
      resource?: URL;
      state?: string;
      codeChallenge: string;
      codeChallengeMethod?: string;
    },
    res: Response
  ): Promise<void> {
    // Generate a state token that includes both GitHub state and client info
    const internalState = randomUUID();

    // Store the authorization request details
    this.storage.saveCode(internalState, {
      clientId: client.client_id,
      redirectUri: params.redirectUri,
      scopes: params.scopes?.join(' '),
      resource: params.resource?.toString(),
      state: params.state,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      expiresAt: Date.now() + 600000 // 10 minutes
    });

    // Redirect to GitHub OAuth
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', this.githubClientId);
    githubAuthUrl.searchParams.set('redirect_uri', `${this.baseUrl}/oauth/callback`);
    githubAuthUrl.searchParams.set('state', internalState);
    githubAuthUrl.searchParams.set('scope', 'read:user user:email');

    logger.info('Redirecting to GitHub OAuth', { state: internalState });
    res.redirect(githubAuthUrl.toString());
  }

  async handleGitHubCallback(code: string, state: string): Promise<{
    redirectUri: string;
    authCode: string;
    clientState?: string;
  }> {
    // Get the stored authorization request
    const authRequest = this.storage.getCode(state);
    if (!authRequest) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for GitHub access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.githubClientId,
        client_secret: this.githubClientSecret,
        code,
        redirect_uri: `${this.baseUrl}/oauth/callback`
      })
    });

    const tokenData = await tokenResponse.json() as any;
    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });

    const githubUser = await userResponse.json() as GitHubUser;

    logger.info('GitHub user authenticated', {
      login: githubUser.login,
      userId: githubUser.id
    });

    // Generate our own authorization code for the MCP client
    const mcpAuthCode = randomUUID();

    // Store the GitHub token associated with this MCP auth code
    this.storage.saveCode(mcpAuthCode, {
      clientId: authRequest.clientId,
      redirectUri: authRequest.redirectUri,
      scopes: authRequest.scopes,
      resource: authRequest.resource,
      state: authRequest.state,
      codeChallenge: authRequest.codeChallenge,
      codeChallengeMethod: authRequest.codeChallengeMethod,
      expiresAt: Date.now() + 600000 // 10 minutes
    });

    // Store GitHub user info with the token
    const token = randomUUID();
    this.storage.saveToken(token, {
      clientId: authRequest.clientId,
      scopes: authRequest.scopes || '',
      expiresAt: Date.now() + 3600000, // 1 hour
      resource: authRequest.resource
    });

    // Clean up the state code
    this.storage.deleteCode(state);

    return {
      redirectUri: authRequest.redirectUri,
      authCode: mcpAuthCode,
      clientState: authRequest.state
    };
  }

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const codeData = this.storage.getCode(authorizationCode);
    if (!codeData) {
      throw new Error('Invalid authorization code');
    }
    return codeData.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    _resource?: URL
  ): Promise<OAuthTokens> {
    const codeData = this.storage.getCode(authorizationCode);
    if (!codeData) {
      throw new Error('Invalid authorization code');
    }

    if (codeData.clientId !== client.client_id) {
      throw new Error('Authorization code was not issued to this client');
    }

    this.storage.deleteCode(authorizationCode);

    const token = randomUUID();
    const scopes = codeData.scopes ? codeData.scopes.split(' ') : [];

    this.storage.saveToken(token, {
      clientId: client.client_id,
      scopes: codeData.scopes || '',
      expiresAt: Date.now() + 3600000, // 1 hour
      resource: codeData.resource
    });

    logger.info('OAuth token issued via GitHub', {
      clientId: client.client_id,
      expiresIn: 3600
    });

    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      scope: scopes.join(' '),
    };
  }

  async exchangeRefreshToken(
    _client: OAuthClientInformationFull,
    _refreshToken: string,
    _scopes?: string[],
    _resource?: URL
  ): Promise<OAuthTokens> {
    throw new Error('Refresh tokens not implemented');
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const tokenData = this.storage.getToken(token);
    if (!tokenData) {
      throw new Error('Invalid or expired token');
    }

    return {
      token,
      clientId: tokenData.clientId,
      scopes: tokenData.scopes ? tokenData.scopes.split(' ') : [],
      expiresAt: Math.floor(tokenData.expiresAt / 1000),
      resource: tokenData.resource ? new URL(tokenData.resource) : undefined,
    };
  }

  close(): void {
    this.storage.close();
  }
}
