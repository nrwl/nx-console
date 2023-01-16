import { getTelemetry } from '@nx-console/vscode/utils';
import { v4 as uuid } from 'uuid';
import {
  authentication,
  AuthenticationProvider,
  AuthenticationProviderAuthenticationSessionsChangeEvent,
  AuthenticationSession,
  commands,
  Disposable,
  EventEmitter,
  ExtensionContext,
  ProgressLocation,
  window,
} from 'vscode';
import { AuthConfig, OAuthService } from './oauth.service';
import { SecretSessionStore } from './secret-session-store';

export const AUTH_NAME = 'Nx Cloud';
export const AUTH_TYPE = 'nxCloud';

export class NxCloudAuthenticationProvider
  implements AuthenticationProvider, Disposable
{
  private _sessionChangeEmitter =
    new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();
  private _disposable: Disposable;

  private _secretSessionStore: SecretSessionStore;
  private _oAuthService: OAuthService;

  constructor(readonly context: ExtensionContext, config: AuthConfig) {
    this._secretSessionStore = new SecretSessionStore(context);
    this._oAuthService = new OAuthService(context, config);

    this._disposable = Disposable.from(
      authentication.registerAuthenticationProvider(
        AUTH_TYPE,
        AUTH_NAME,
        this,
        { supportsMultipleAccounts: false }
      ),
      commands.registerCommand('nxConsole.loginToNxCloud', () => {
        authentication.getSession('nxCloud', [], { createIfNone: true });
      })
    );
    this.initialize();
  }

  public refresh() {
    this.initialize();
  }

  private async initialize() {
    const sessions = await this._secretSessionStore.getSessions();

    if (!sessions || sessions.length === 0) {
      return;
    }

    const validatedSessions = await this.validateAndRefreshSessions(sessions);

    const removedSessions: AuthenticationSession[] = [];
    const changedSessions: AuthenticationSession[] = [];
    for (const session of sessions) {
      const validatedSession = validatedSessions.find(
        (s) => s?.id === session.id
      );
      if (!validatedSession) {
        this.removeSession(session.id);
        removedSessions.push(session);
      } else if (validatedSession.accessToken !== session.accessToken) {
        changedSessions.push(validatedSession);
      }
    }

    await this._secretSessionStore.storeSessions(validatedSessions ?? []);

    this._sessionChangeEmitter.fire({
      added: [],
      removed: removedSessions,
      changed: changedSessions,
    });
  }

  get onDidChangeSessions() {
    return this._sessionChangeEmitter.event;
  }

  /**
   * Get the existing sessions
   * @param scopes
   * @returns
   */
  public async getSessions(
    _?: string[]
  ): Promise<readonly AuthenticationSession[]> {
    return (await this._secretSessionStore.getSessions()) ?? [];
  }

  /**
   * Create a new auth session. Implements standard oidc authorization code flow
   * @param scopes
   * @returns
   */
  public async createSession(scopes: string[]): Promise<AuthenticationSession> {
    return await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: 'Logging in to Nx Cloud...',
        cancellable: true,
      },
      async (_, cancellationToken) => {
        try {
          const tokens = await this._oAuthService
            .loginAndGetTokens(scopes, cancellationToken)
            .catch((error) => {
              throw error;
            });

          if (!tokens) {
            throw new Error('Login failed');
          }

          const { access_token: accessToken, refresh_token: refreshToken } =
            tokens;

          const userInfo = await this._oAuthService.getUserInfo(accessToken);

          const session: AuthenticationSession = {
            id: uuid(),
            accessToken,
            account: {
              id: userInfo.email,
              label: userInfo.name,
            },
            scopes,
          };

          await this._secretSessionStore.storeSessions([session]);

          await this._secretSessionStore.storeRefreshTokens([
            { id: session.id, refreshToken },
          ]);

          this._sessionChangeEmitter.fire({
            added: [session],
            removed: [],
            changed: [],
          });

          window.showInformationMessage(
            `Successfully authenticated with Nx Cloud. Welcome, ${userInfo.name}`
          );

          getTelemetry().featureUsed('nxConsole.cloud.login');

          return session;
        } catch (error: any) {
          if (error.id) {
            if (error.id === 'login-cancelled') {
              // noop
            }
            if (error.id === 'login-timeout') {
              window.showErrorMessage(
                `Login failed: timed out while waiting for browser response`
              );
            }
            throw new Error('Login failed');
          } else {
            window.showErrorMessage(
              `Login failed. Please try again. /n ${error}`
            );
            throw error;
          }
        }
      }
    );
  }

  /**
   * Remove an existing session
   * @param sessionId
   */
  public async removeSession(sessionId: string): Promise<void> {
    const sessions = await this._secretSessionStore.getSessions();
    if (sessions) {
      // TODO: use logout endpoint to invalidate token and remove refresh token from store
      // https://auth0.com/docs/api/authentication#logout

      let sessionToRemove: AuthenticationSession | undefined = undefined;
      const remainingSessions: AuthenticationSession[] = [];
      sessions.forEach((s) => {
        if (s.id === sessionId) {
          sessionToRemove = s;
        } else {
          remainingSessions.push(s);
        }
      });

      const refreshTokens = await this._secretSessionStore.getRefreshTokens();
      if (refreshTokens) {
        const remainingRefreshTokens = refreshTokens.filter(
          (refreshToken) => refreshToken.id !== sessionId
        );
        await this._secretSessionStore.storeRefreshTokens(
          remainingRefreshTokens
        );
      }

      await this._secretSessionStore.storeSessions(remainingSessions);

      getTelemetry().featureUsed('nxConsole.cloud.logout');

      if (sessionToRemove) {
        this._sessionChangeEmitter.fire({
          added: [],
          removed: [sessionToRemove],
          changed: [],
        });
      }
    }
  }

  private async validateAndRefreshSessions(
    sessions: AuthenticationSession[]
  ): Promise<AuthenticationSession[]> {
    const accessTokens = sessions.map((s) => s.accessToken);
    const accessTokenValidityMap: Map<string, boolean> =
      await this._oAuthService.validateAccessTokens(accessTokens);

    // if all tokens are valid, return the sessions unchanged
    if ([...accessTokenValidityMap.values()].every((s) => s)) {
      return sessions;
    }

    const refreshTokens = await this._secretSessionStore.getRefreshTokens();

    // if we can't refresh, return only the valid sessions
    if (!refreshTokens || refreshTokens?.length === 0) {
      return sessions.filter(
        (session) => accessTokenValidityMap.get(session.accessToken) ?? false
      );
    }

    const refreshedSessions: AuthenticationSession[] = [];

    for (const session of sessions) {
      try {
        // if the access token is valid, keep the session unchanged
        const sessionValid = accessTokenValidityMap.get(session.accessToken);
        if (sessionValid) {
          refreshedSessions.push(session);
        }

        // if we can't refresh the access token, remove the session
        const refreshTokenForSession = refreshTokens.find(
          (refreshToken) => refreshToken.id === session.id
        );
        if (!refreshTokenForSession) {
          continue;
        }

        // if the access token is invalid, try to refresh it, update the session and save the new refresh token
        const refreshedTokens = await this._oAuthService.getRefreshedTokens(
          refreshTokenForSession.refreshToken,
          [...session.scopes]
        );

        if (!refreshedTokens) {
          continue;
        }

        const {
          accessToken: refreshedAccessToken,
          refreshToken: refreshedRefreshToken,
        } = refreshedTokens;

        refreshedSessions.push({
          ...session,
          accessToken: refreshedAccessToken,
        });
        this._secretSessionStore.storeRefreshTokenForId(
          session.id,
          refreshedRefreshToken
        );
      } catch (_) {
        continue;
      }
    }

    return refreshedSessions;
  }

  public async dispose() {
    this._disposable.dispose();
  }
}
