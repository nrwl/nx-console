import { platform } from 'os';
import { xhr, XHRResponse } from 'request-light';
import { Logger } from '@nx-console/shared-utils';

export class GoogleAnalytics {
  MEASUREMENT_ID = 'G-TNJ97NGX40';
  API_TOKEN = '3J_QsvygSLKfjxMXFSG03Q';

  private production: boolean;
  private clientId: string;
  private userId: string;
  private applicationVersion: string;
  private nxVersion: string;
  private isTelemetryEnabled: boolean;
  private editor: string;

  constructor(
    production: boolean,
    clientId: string,
    userId: string,
    applicationVersion: string,
    isTelemetryEnabled: boolean,
    editor: string,
    private logger: Logger,
    nxVersion?: string,
  ) {
    this.production = production;
    this.clientId = clientId;
    this.userId = userId;
    this.applicationVersion = applicationVersion;
    this.nxVersion = nxVersion || '0.0.0';
    this.isTelemetryEnabled = isTelemetryEnabled;
    this.editor = editor;
  }

  public setNxVersion(version: string): void {
    this.nxVersion = version;
  }

  public sendEventData(
    eventName: string,
    data?: Record<string, any>,
    sessionId?: string,
  ): void {
    eventName = eventName.replace('nrwl.angular-console/', '');
    this._post(
      this._buildPayload({
        name: 'action_triggered',
        params: {
          ...this._eventParams(sessionId),
          action_type: eventName,
          ...data,
        },
      }),
    );
  }

  private _eventParams(sessionId?: string) {
    return {
      engagement_time_msec: '1',
      session_id: sessionId || 'unknown-session',
      debug_mode: !this.production,
    };
  }

  private _buildPayload(event: { name: string; params: Record<string, any> }) {
    return {
      client_id: this.clientId,
      user_id: this.userId,
      timestamp_micros: Date.now() * 1000,
      non_personalized_ads: true,
      user_properties: {
        editor: { value: this.editor },
        os: { value: platform() },
        appversion: { value: this.applicationVersion },
        nxversion: { value: this.nxVersion },
      },
      events: [event],
    };
  }

  private _post(body: object) {
    if (!this.isTelemetryEnabled) {
      return;
    }

    const base = this.production
      ? 'https://www.google-analytics.com/mp'
      : 'https://www.google-analytics.com/debug/mp';

    const url = `${base}/collect?api_secret=${this.API_TOKEN}&measurement_id=${this.MEASUREMENT_ID}`;

    xhr({
      url,
      data: JSON.stringify(body),
      type: 'POST',
    })
      .then((response) => {
        if (this.production === false && response.responseText.length > 0) {
          this.logger.log(`Telemetry Response: ${response.responseText}`);
        }
      })
      .catch((reason: XHRResponse) => {
        this.logger.log(`unable to send telemetry: ${reason.responseText}`);
      });
  }
}
