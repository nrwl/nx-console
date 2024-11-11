import { platform } from 'os';
import { xhr, XHRResponse } from 'request-light';
import { env, extensions, TelemetrySender } from 'vscode';

import { getOutputChannel } from '@nx-console/vscode/output-channels';

// @ts-expect-error -- Browser Rollbar is not typed
import Rollbar = require('rollbar/src/browser/rollbar');
export class GoogleAnalyticsSender implements TelemetrySender {
  MEASUREMENT_ID = 'G-TNJ97NGX40';
  API_TOKEN = '3J_QsvygSLKfjxMXFSG03Q';

  private _version: string;
  private rollbar = new Rollbar({
    accessToken: 'd7f75cfc52e745b697be89ef23dbe436',
    captureUncaught: false,
    captureUnhandledRejections: false,
  });

  constructor(private production: boolean) {
    this._version =
      extensions.getExtension('nrwl.angular-console')?.packageJSON?.version ??
      '0.0.0';
  }
  sendEventData(eventName: string, data?: Record<string, any>): void {
    eventName = eventName.replace('nrwl.angular-console/', '');
    this._post(
      this._buildPayload({
        name: 'action_triggered',
        params: {
          ...this._eventParams(),
          action_type: eventName,
          ...data,
        },
      })
    );
  }
  sendErrorData(error: Error, data?: Record<string, any>): void {
    getOutputChannel().appendLine(`Uncaught Exception: ${error}`);

    const shouldLogToRollbar = this.production
      ? Math.floor(Math.random() * 75) === 0
      : true;
    if (shouldLogToRollbar) {
      this.rollbar.error(error);
    }
    this.sendEventData('misc.exception', {
      ...data,
      name: error.name,
    });
  }

  private _eventParams() {
    return {
      engagement_time_msec: '1',
      session_id: env.sessionId,
      debug_mode: !this.production,
    };
  }

  private _buildPayload(event: { name: string; params: Record<string, any> }) {
    return {
      client_id: env.machineId,
      user_id: env.machineId,
      timestamp_micros: Date.now() * 1000,
      non_personalized_ads: true,
      user_properties: {
        editor: { value: 'vscode' },
        os: { value: platform() },
        appversion: { value: this._version },
      },
      events: [event],
    };
  }

  private _post(body: object) {
    if (!env.isTelemetryEnabled) {
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
          getOutputChannel().append(
            `Telemetry Response: ${response.responseText}`
          );
        }
      })
      .catch((reason: XHRResponse) => {
        getOutputChannel().append(
          `unable to send telemetry: ${reason.responseText}`
        );
      });
  }
}
