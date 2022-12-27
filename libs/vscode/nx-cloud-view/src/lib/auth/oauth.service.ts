import { xhr } from 'request-light';
import { v4 as uuid } from 'uuid';
import {
  CancellationToken,
  env,
  EventEmitter,
  ExtensionContext,
  Uri,
  UriHandler,
  window,
} from 'vscode';

const staging_config = {
  clientId: '11Zte67xGtfrGQhRVlz9zM8Fq0LvZYwe',
  audience: 'https://api.staging.nrwl.io/',
  domain: 'https://auth.staging.nx.app/login',
};

const prod_config = {
  clientId: 'm6PYBsCK1t2DTKnbE30n029C22fqtTMm',
  audience: 'https://api.nrwl.io/',
  domain: 'https://nrwl.auth0.com/login',
};

export class OAuthService {
  private _oAuthConfig: { clientId: string; audience: string; domain: string };
  private _codeExchangePromise: Promise<string | undefined> | undefined;
  private _stateId: string | undefined;
  private _uriHandler = new UriEventHandler();

  constructor(private context: ExtensionContext, config: 'prod' | 'dev') {
    this._oAuthConfig = config === 'prod' ? prod_config : staging_config;
    window.registerUriHandler(this._uriHandler);
  }
  get redirectUri() {
    const publisher = this.context.extension.packageJSON.publisher;
    const name = this.context.extension.packageJSON.name;
    return `${env.uriScheme}://${publisher}.${name}`;
  }

  async loginAndGetTokens(
    scopes: string[],
    cancellationToken: CancellationToken
  ): Promise<{ access_token: string; refresh_token: string }> {
    const authCode = await this.login(scopes, cancellationToken);

    if (!authCode) {
      throw new Error('Login failed');
    }

    const tokens = await this.getTokensFromAuthCode(authCode);

    if (!tokens) {
      throw new Error('Login failed');
    }

    return tokens;
  }

  private async login(
    scopes: string[] = [],
    cancellationToken: CancellationToken
  ): Promise<string | undefined> {
    this._stateId = uuid();

    if (!scopes.includes('openid')) {
      scopes.push('openid');
    }
    if (!scopes.includes('profile')) {
      scopes.push('profile');
    }
    if (!scopes.includes('email')) {
      scopes.push('email');
    }
    if (!scopes.includes('offline_access')) {
      scopes.push('offline_access');
    }

    const scopeString = scopes.join(' ');

    const searchParams = new URLSearchParams([
      ['response_type', 'code'],
      ['client_id', this._oAuthConfig.clientId],
      ['redirect_uri', this.redirectUri],
      ['state', this._stateId],
      ['scope', scopeString],
      ['audience', this._oAuthConfig.audience],
    ]);

    const uri = Uri.parse(
      `${this._oAuthConfig.domain}/authorize?${searchParams.toString()}`
    );
    await env.openExternal(uri);

    if (!this._codeExchangePromise) {
      this._codeExchangePromise = new Promise((resolve) => {
        this._uriHandler.event((val) => resolve(this.handleUri(val)));
      });
    }

    const cancellationPromise = new Promise<undefined>((_, reject) => {
      cancellationToken.onCancellationRequested(() => {
        reject({ id: 'login-cancelled' });
      });
    });

    const timeoutPromise = new Promise<undefined>((_, reject) => {
      setTimeout(() => {
        reject({ id: 'login-timeout' });
      }, 1000 * 30);
    });

    return await Promise.race([
      this._codeExchangePromise.catch(() => {
        this._stateId = '';
        this._codeExchangePromise = undefined;
        return undefined;
      }),
      cancellationPromise,
      timeoutPromise,
    ]).finally(() => {
      this._codeExchangePromise = undefined;
      this._stateId = undefined;
    });
  }

  private async getTokensFromAuthCode(
    authCode: string
  ): Promise<{ access_token: string; refresh_token: string } | undefined> {
    const searchParams = new URLSearchParams([
      ['grant_type', 'authorization_code'],
      ['client_id', this._oAuthConfig.clientId],
      ['code', authCode],
      ['redirect_uri', this.redirectUri],
      ['audience', this._oAuthConfig.audience],
    ]);
    try {
      return await xhr({
        type: 'POST',
        url: `${this._oAuthConfig.domain}/oauth/token`,
        data: searchParams.toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }).then((r) => {
        return JSON.parse(r.responseText);
      });
    } catch (_) {
      return undefined;
    }
  }

  async getUserInfo(token: string) {
    try {
      const response = await xhr({
        url: `${this._oAuthConfig.domain}/userinfo`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((r) => JSON.parse(r.responseText));

      return response;
    } catch (error) {
      throw new Error('Could not retrieve user info');
    }
  }

  async validateAccessTokens(
    accessTokens: string[]
  ): Promise<Map<string, boolean>> {
    const accessTokenValidity = await Promise.all(
      accessTokens.map((accessToken) =>
        this.getUserInfo(accessToken).then(
          () => ({ accessToken: accessToken, valid: true }),
          () => ({ accessToken: accessToken, valid: false })
        )
      )
    );
    const validityMap = new Map<string, boolean>();
    accessTokenValidity.forEach((atv) =>
      validityMap.set(atv.accessToken, atv.valid)
    );
    return validityMap;
  }

  async getRefreshedTokens(
    refreshToken: string,
    scopes: string[]
  ): Promise<{ accessToken: string; refreshToken: string } | undefined> {
    const searchParams = new URLSearchParams([
      ['grant_type', 'refresh_token'],
      ['refresh_token', refreshToken],
      ['client_id', this._oAuthConfig.clientId],
      ['redirect_uri', this.redirectUri],
      ['scope', scopes.join(' ')],
    ]);
    try {
      return await xhr({
        type: 'POST',
        url: `${this._oAuthConfig.domain}/oauth/token`,
        data: searchParams.toString(),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      }).then((r) => {
        const response = JSON.parse(r.responseText);
        return {
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
        };
      });
    } catch (_) {
      return undefined;
    }
  }

  private handleUri(uri: Uri): string | undefined {
    const query = new URLSearchParams(uri.query);
    const code = query.get('code');
    const state = query.get('state');

    if (!code) {
      return;
    }
    if (!state || this._stateId !== state) {
      return;
    }

    return code;
  }
}

class UriEventHandler extends EventEmitter<Uri> implements UriHandler {
  public handleUri(uri: Uri) {
    this.fire(uri);
  }
}
