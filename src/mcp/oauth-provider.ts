import { randomUUID } from 'node:crypto';
import type { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import { Response } from 'express';

interface CodeData {
  client: OAuthClientInformationFull;
  params: {
    redirectUri: string;
    scopes?: string[];
    resource?: URL;
    state?: string;
    codeChallenge: string;
    codeChallengeMethod?: string;
  };
}

interface TokenData {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt: number;
  resource?: URL;
  type: 'access';
}

export class InMemoryClientsStore implements OAuthRegisteredClientsStore {
  private clients = new Map<string, OAuthClientInformationFull>();

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    return this.clients.get(clientId);
  }

  async registerClient(clientMetadata: OAuthClientInformationFull): Promise<OAuthClientInformationFull> {
    this.clients.set(clientMetadata.client_id, clientMetadata);
    return clientMetadata;
  }
}

export class N8nMcpOAuthProvider implements OAuthServerProvider {
  private _clientsStore = new InMemoryClientsStore();
  private codes = new Map<string, CodeData>();
  private tokens = new Map<string, TokenData>();

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

    this.codes.set(code, { client, params });

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
    const codeData = this.codes.get(authorizationCode);
    if (!codeData) {
      throw new Error('Invalid authorization code');
    }
    return codeData.params.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    _resource?: URL
  ): Promise<OAuthTokens> {
    const codeData = this.codes.get(authorizationCode);
    if (!codeData) {
      throw new Error('Invalid authorization code');
    }

    if (codeData.client.client_id !== client.client_id) {
      throw new Error('Authorization code was not issued to this client');
    }

    this.codes.delete(authorizationCode);

    const token = randomUUID();
    const tokenData: TokenData = {
      token,
      clientId: client.client_id,
      scopes: codeData.params.scopes || [],
      expiresAt: Date.now() + 3600000, // 1 hour
      resource: codeData.params.resource,
      type: 'access',
    };

    this.tokens.set(token, tokenData);

    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      scope: (codeData.params.scopes || []).join(' '),
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
    const tokenData = this.tokens.get(token);
    if (!tokenData || tokenData.expiresAt < Date.now()) {
      throw new Error('Invalid or expired token');
    }

    return {
      token,
      clientId: tokenData.clientId,
      scopes: tokenData.scopes,
      expiresAt: Math.floor(tokenData.expiresAt / 1000),
      resource: tokenData.resource,
    };
  }

  getClientsStore(): InMemoryClientsStore {
    return this._clientsStore;
  }
}
