import { platform } from 'os';
import { xhr, XHRResponse } from 'request-light';
import { env, extensions } from 'vscode';
import { TelemetryMessageBuilder } from '../message-builder';
import { TelemetryType } from '../record';
import { Sink } from '../sink';
import { getOutputChannel } from '@nx-console/vscode/output-channels';

class TelemetryParams {
  constructor(readonly type: string, readonly data: any) {}

  fetch(key: string): any {
    this.require(key);
    return this.data[key];
  }

  require(key: string) {
    const msg = `Telemetry: ${this.type} is missing ${key}`;
    // eslint-disable-next-line no-prototype-builtins
    if (!this.data.hasOwnProperty(key)) {
      throw new Error(msg);
    }
  }
}

export class GoogleAnalyticsSink implements Sink, TelemetryMessageBuilder {
  MEASUREMENT_ID = 'G-TNJ97NGX40';
  API_TOKEN = '3J_QsvygSLKfjxMXFSG03Q';

  private _version: string;
  constructor(private production: boolean) {
    this._version =
      extensions.getExtension('nrwl.angular-console')?.packageJSON?.version ??
      '0.0.0';
  }

  record(type: TelemetryType, data: any): void {
    const params = new TelemetryParams(type, data);

    switch (type) {
      case 'ExtensionActivated':
        this.extensionActivated(params.fetch('time'));
        break;
      case 'ExtensionDeactivated':
        this.extensionDeactivated();
        break;
      case 'FeatureUsed':
        this.featureUsed(params.fetch('feature'), params.fetch('details'));
        break;
      default:
        throw new Error(`Unknown Telemetry type: ${type}`);
    }
  }

  extensionActivated(time: number): void {
    this._post(
      this._buildPayload({
        name: 'activated',
        params: {
          ...this._eventParams(),
          timing: time,
        },
      })
    );
  }

  extensionDeactivated(): void {
    this._post(
      this._buildPayload({
        name: 'deactivated',
        params: {
          ...this._eventParams(),
        },
      })
    );
  }

  featureUsed(feature: string, details: object): void {
    this._post(
      this._buildPayload({
        name: 'action_triggered',
        params: {
          ...this._eventParams(),
          action_type: feature,
          ...details,
        },
      })
    );
  }

  private _eventParams() {
    return {
      engagement_time_msec: '1',
      session_id: env.sessionId,
      debug_mode: !this.production,
    };
  }

  private _buildPayload(event: object) {
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
        if (response.responseText.length > 0) {
          getOutputChannel().append(response.responseText);
        }
      })
      .catch((reason: XHRResponse) => {
        getOutputChannel().append(
          `unable to send telemetry: ${reason.responseText}`
        );
      });
  }
}
