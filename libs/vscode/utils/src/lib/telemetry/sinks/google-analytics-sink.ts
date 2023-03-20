import { Sink } from '../sink';
import { TelemetryType } from '../record';
import { TelemetryMessageBuilder } from '../message-builder';
import { env, extensions } from 'vscode';
import { platform } from 'os';

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
  constructor() {
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
      case 'StartedTracking':
        this.startedTracking();
        break;
      case 'StoppedTracking':
        this.stoppedTracking();
        break;
      case 'ScreenViewed':
        this.screenViewed(params.fetch('screen'));
        break;
      case 'CommandRun':
        this.commandRun(params.fetch('commandType'), params.fetch('time'));
        break;
      case 'ExceptionOccurred':
        this.exception(params.fetch('error'));
        break;
      case 'FeatureUsed':
        this.featureUsed(params.fetch('feature'));
        break;
      default:
        throw new Error(`Unknown Telemetry type: ${type}`);
    }
  }

  extensionActivated(time: number): void {
    throw new Error('Method not implemented.');
  }
  extensionDeactivated(): void {
    throw new Error('Method not implemented.');
  }
  startedTracking(): void {
    throw new Error('Method not implemented.');
  }
  stoppedTracking(): void {
    throw new Error('Method not implemented.');
  }
  screenViewed(screen: string): void {
    throw new Error('Method not implemented.');
  }
  commandRun(commandType: string, time: number): void {
    throw new Error('Method not implemented.');
  }
  exception(error: string): void {
    throw new Error('Method not implemented.');
  }
  featureUsed(feature: string): void {
    this._post(
      this._buildPayload({
        name: 'action_triggered',
        params: {
          items: [],
          action_type: feature,
          engagement_time_msec: '1',
          session_id: env.sessionId,
        },
      })
    );
  }

  private _buildPayload(event: object) {
    return {
      client_id: env.machineId,
      timestamp_micros: Date.now(),
      non_personalized_ads: true,
      user_properties: {
        editor: { value: 'vscode' },
        os: { value: platform() },
        appversion: { value: this._version },
      },
      events: [event],
      validationBehavior: 'ENFORCE_RECOMMENDATIONS',
      method: 'POST',
      credentials: 'omit',
    };
  }

  private _post(body: object) {
    if (!env.isTelemetryEnabled) {
      return;
    }

    fetch(
      `https://www.google-analytics.com/mp/collect?api_secret=${this.API_TOKEN}&measurement_id=${this.MEASUREMENT_ID}`,
      {
        headers: {
          accept: '*/*',
          'accept-language': 'en-US,en;q=0.9',
          'cache-control': 'no-cache',
          'content-type': 'text/plain;charset=UTF-8',
        },
        body: JSON.stringify(body),
        method: 'POST',
      }
    );
  }
}
