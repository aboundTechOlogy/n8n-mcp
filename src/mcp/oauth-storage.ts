import Database from 'better-sqlite3';
import { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import { logger } from '../utils/logger.js';
import path from 'path';

interface StoredToken {
  token: string;
  clientId: string;
  scopes: string;
  expiresAt: number;
  resource?: string;
  createdAt: number;
}

interface StoredCode {
  code: string;
  clientId: string;
  redirectUri: string;
  scopes?: string;
  resource?: string;
  state?: string;
  codeChallenge: string;
  codeChallengeMethod?: string;
  createdAt: number;
  expiresAt: number;
}

export class OAuthStorage {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const storagePath = dbPath || path.join(process.cwd(), 'data', 'oauth.db');
    this.db = new Database(storagePath);
    this.initSchema();
    logger.info('OAuth storage initialized', { path: storagePath });
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_clients (
        client_id TEXT PRIMARY KEY,
        client_data TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS oauth_codes (
        code TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        redirect_uri TEXT NOT NULL,
        scopes TEXT,
        resource TEXT,
        state TEXT,
        code_challenge TEXT NOT NULL,
        code_challenge_method TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS oauth_tokens (
        token TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        scopes TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        resource TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_codes_expires ON oauth_codes(expires_at);
      CREATE INDEX IF NOT EXISTS idx_tokens_expires ON oauth_tokens(expires_at);
    `);

    // Clean up expired codes and tokens on startup
    this.cleanupExpired();
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const deletedCodes = this.db.prepare('DELETE FROM oauth_codes WHERE expires_at < ?').run(now);
    const deletedTokens = this.db.prepare('DELETE FROM oauth_tokens WHERE expires_at < ?').run(now);

    if (deletedCodes.changes > 0 || deletedTokens.changes > 0) {
      logger.info('Cleaned up expired OAuth data', {
        codes: deletedCodes.changes,
        tokens: deletedTokens.changes
      });
    }
  }

  // Client methods
  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    const row = this.db.prepare('SELECT client_data FROM oauth_clients WHERE client_id = ?').get(clientId) as { client_data: string } | undefined;
    return row ? JSON.parse(row.client_data) : undefined;
  }

  async registerClient(client: OAuthClientInformationFull): Promise<OAuthClientInformationFull> {
    this.db.prepare('INSERT OR REPLACE INTO oauth_clients (client_id, client_data, created_at) VALUES (?, ?, ?)').run(
      client.client_id,
      JSON.stringify(client),
      Date.now()
    );
    logger.info('OAuth client registered', { clientId: client.client_id });
    return client;
  }

  // Code methods
  saveCode(code: string, data: Omit<StoredCode, 'code' | 'createdAt'>): void {
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO oauth_codes (code, client_id, redirect_uri, scopes, resource, state, code_challenge, code_challenge_method, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code,
      data.clientId,
      data.redirectUri,
      data.scopes,
      data.resource,
      data.state,
      data.codeChallenge,
      data.codeChallengeMethod,
      now,
      data.expiresAt
    );
  }

  getCode(code: string): StoredCode | undefined {
    const row = this.db.prepare('SELECT * FROM oauth_codes WHERE code = ? AND expires_at > ?').get(code, Date.now()) as StoredCode | undefined;
    return row;
  }

  deleteCode(code: string): void {
    this.db.prepare('DELETE FROM oauth_codes WHERE code = ?').run(code);
  }

  // Token methods
  saveToken(token: string, data: Omit<StoredToken, 'token' | 'createdAt'>): void {
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO oauth_tokens (token, client_id, scopes, expires_at, resource, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      token,
      data.clientId,
      data.scopes,
      data.expiresAt,
      data.resource,
      now
    );
  }

  getToken(token: string): StoredToken | undefined {
    const row = this.db.prepare('SELECT * FROM oauth_tokens WHERE token = ? AND expires_at > ?').get(token, Date.now()) as StoredToken | undefined;
    return row;
  }

  deleteToken(token: string): void {
    this.db.prepare('DELETE FROM oauth_tokens WHERE token = ?').run(token);
  }

  // Cleanup methods
  cleanupExpiredTokens(): number {
    const result = this.db.prepare('DELETE FROM oauth_tokens WHERE expires_at < ?').run(Date.now());
    return result.changes;
  }

  cleanupExpiredCodes(): number {
    const result = this.db.prepare('DELETE FROM oauth_codes WHERE expires_at < ?').run(Date.now());
    return result.changes;
  }

  close(): void {
    this.db.close();
  }
}
