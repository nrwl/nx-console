import { AuthenticationSession, ExtensionContext } from 'vscode';

const SESSION_STORAGE_KEY = `nxCloud.session`;
const REFRESH_TOKEN_STORAGE_KEY = `nxCloud.refreshToken`;

export class SecretSessionStore {
  constructor(private context: ExtensionContext) {}

  async getSessions(): Promise<AuthenticationSession[] | undefined> {
    const sessions = await this.context.secrets.get(SESSION_STORAGE_KEY);

    if (!sessions) {
      return;
    }
    try {
      return JSON.parse(sessions) as AuthenticationSession[];
    } catch (e) {
      return;
    }
  }

  async storeSessions(sessions: AuthenticationSession[]): Promise<void> {
    await this.context.secrets.store(
      SESSION_STORAGE_KEY,
      JSON.stringify(sessions)
    );
  }

  async getRefreshTokens(): Promise<
    { id: string; refreshToken: string }[] | undefined
  > {
    const refreshTokens = await this.context.secrets.get(
      REFRESH_TOKEN_STORAGE_KEY
    );
    if (!refreshTokens) {
      return;
    }

    try {
      return JSON.parse(refreshTokens) as {
        id: string;
        refreshToken: string;
      }[];
    } catch (e) {
      return;
    }
  }

  async storeRefreshTokens(
    refreshTokens: { id: string; refreshToken: string }[]
  ): Promise<void> {
    await this.context.secrets.store(
      REFRESH_TOKEN_STORAGE_KEY,
      JSON.stringify(refreshTokens)
    );
  }

  async storeRefreshTokenForId(id: string, refreshToken: string) {
    const refreshTokens = await this.getRefreshTokens();
    const newRefreshTokens = refreshTokens
      ? refreshTokens.filter((t) => t.id !== id)
      : [];
    newRefreshTokens.push({ id, refreshToken });
    await this.storeRefreshTokens(newRefreshTokens);
  }
}
