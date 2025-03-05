import { platform } from 'os';
import { xhr, XHRResponse } from 'request-light';
import { Logger } from '@nx-console/shared-utils';
import { TelemetryEvents } from './telemetry-types';

// There are different ways google analytics can process events:
// - production: events are sent to the real google analytics & processed lazily
// - debug_view: events are send to google analytics and individually visible in the DebugView
// - debug_validate: events are sent to the /debug/mp endpoint which returns validation messages
export type GoogleAnalyticsMode =
  | 'production'
  | 'debug_view'
  | 'debug_validate';

export class GoogleAnalytics {
  MEASUREMENT_ID = 'G-TNJ97NGX40';
  API_TOKEN = '3J_QsvygSLKfjxMXFSG03Q';

  private nxVersion: string;

  constructor(
    private mode: GoogleAnalyticsMode,
    private clientId: string,
    private userId: string,
    private sessionId: string,
    private applicationVersion: string,
    private editor: string,
    private logger?: Logger,
    nxVersion?: string,
  ) {
    this.nxVersion = nxVersion || '0.0.0';
  }

  public setNxVersion(version: string): void {
    this.nxVersion = version;
  }

  public sendEventData(
    eventName: TelemetryEvents,
    data?: Record<string, any>,
  ): void {
    const eventNameString = eventName.replace('nrwl.angular-console/', '');
    this._post(
      this._buildPayload({
        name: 'action_triggered',
        params: {
          ...this._eventParams(),
          action_type: eventNameString,
          ...data,
        },
      }),
    );
  }

  private _eventParams() {
    return {
      engagement_time_msec: '1',
      session_id: this.sessionId,
      debug_mode: this.mode !== 'production',
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
    const base =
      this.mode !== 'debug_validate'
        ? 'https://www.google-analytics.com/mp'
        : 'https://www.google-analytics.com/debug/mp';

    const url = `${base}/collect?api_secret=${this.API_TOKEN}&measurement_id=${this.MEASUREMENT_ID}`;

    xhr({
      url,
      data: JSON.stringify(body),
      type: 'POST',
    })
      .then((response) => {
        if (this.mode !== 'production' && response.responseText.length > 0) {
          this.logger?.log(`Telemetry Response: ${response.responseText}`);
        }
      })
      .catch((reason: XHRResponse) => {
        this.logger?.log(`unable to send telemetry: ${reason.responseText}`);
      });
  }
}
