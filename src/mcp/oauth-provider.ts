import { randomUUID } from 'node:crypto';
import type { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import { Response } from 'express';
import { OAuthStorage } from './oauth-storage.js';
import { logger } from '../utils/logger.js';

export class PersistentClientsStore implements OAuthRegisteredClientsStore {
  constructor(private storage: OAuthStorage) {}

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    return this.storage.getClient(clientId);
  }

  async registerClient(clientMetadata: OAuthClientInformationFull): Promise<OAuthClientInformationFull> {
    return this.storage.registerClient(clientMetadata);
  }
}

export class N8nMcpOAuthProvider implements OAuthServerProvider {
  private storage: OAuthStorage;
  private _clientsStore: PersistentClientsStore;

  constructor(dbPath?: string) {
    this.storage = new OAuthStorage(dbPath);
    this._clientsStore = new PersistentClientsStore(this.storage);

    // Cleanup expired tokens every hour
    setInterval(() => {
      const deletedTokens = this.storage.cleanupExpiredTokens();
      const deletedCodes = this.storage.cleanupExpiredCodes();
      if (deletedTokens > 0 || deletedCodes > 0) {
        logger.info('OAuth cleanup', { deletedTokens, deletedCodes });
      }
    }, 3600000);
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
    const code = randomUUID();
    const searchParams = new URLSearchParams({ code });

    if (params.state) {
      searchParams.set('state', params.state);
    }

    // Save code to storage
    this.storage.saveCode(code, {
      clientId: client.client_id,
      redirectUri: params.redirectUri,
      scopes: params.scopes?.join(' '),
      resource: params.resource?.toString(),
      state: params.state,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      expiresAt: Date.now() + 600000 // 10 minutes
    });

    if (!client.redirect_uris.includes(params.redirectUri)) {
      throw new Error('Unregistered redirect_uri');
    }

    const targetUrl = new URL(params.redirectUri);
    targetUrl.search = searchParams.toString();
    res.redirect(targetUrl.toString());
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

    logger.info('OAuth token issued', {
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
