import { Sink } from '../sink';
import { TelemetryType } from '../record';
import { User } from '../user';
import { TelemetryMessageBuilder } from '../message-builder';
import { env, extensions } from 'vscode';
import type { Visitor } from 'universal-analytics';
import { xhr } from 'request-light';
import { platform } from 'os';

export type ApplicationPlatform = 'vscode';

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

class MeasurementProtocol {
  MEASUREMENT_ID = 'G-TNJ97NGX40';
  API_TOKEN = '3J_QsvygSLKfjxMXFSG03Q';

  private _version: string;
  constructor() {
    this._version =
      extensions.getExtension('nrwl.angular-console')?.packageJSON?.version ??
      '0.0.0';
  }

  sendEvent(eventName: string) {
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
        body: JSON.stringify({
          client_id: env.machineId,
          timestamp_micros: Date.now(),
          non_personalized_ads: true,
          user_properties: {
            editor: { value: 'vscode' },
            os: { value: platform() },
            appversion: { value: this._version },
          },
          events: [
            {
              name: 'action_triggered',
              params: {
                items: [],
                action_type: eventName,
                engagement_time_msec: '1',
                sessionId: env.sessionId,
              },
            },
          ],
          validationBehavior: 'ENFORCE_RECOMMENDATIONS',
        }),
        method: 'POST',
        credentials: 'omit',
      }
    );
  }
}

export class GoogleAnalyticsSink implements Sink, TelemetryMessageBuilder {
  // eslint-disable-next-line @typescript-eslint/no-var-requires

  mp: MeasurementProtocol;

  constructor() {
    this.mp = new MeasurementProtocol();
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
      case 'WorkspaceType':
        this.workspaceType(params.fetch('workspaceType'));
        break;
      default:
        throw new Error(`Unknown Telemetry type: ${type}`);
    }
  }

  extensionActivated(time: number): void {
    this.visitor
      .event({
        ec: 'Application',
        ea: 'Activated',
      })
      .timing({
        utc: 'Application',
        utv: 'Activation Time',
        utt: time,
      })
      .send();
  }

  extensionDeactivated(): void {
    this.visitor
      .event({
        ec: 'Application',
        ea: 'Deactivated',
      })
      .send();
  }

  startedTracking(): void {
    this.visitor
      .event({
        ec: 'Data Collection',
        ea: 'Opt In',
      })
      .send();
  }

  stoppedTracking(): void {
    this.visitor
      .event({
        ec: 'Data Collection',
        ea: 'Opt Out',
      })
      .send();
  }

  screenViewed(screen: string): void {
    this.visitor
      .screenview({
        an: 'Nx Console',
        cd: screen,
      })
      .send();
  }

  commandRun(commandType: string, time: number): void {
    this.visitor
      .timing({
        utc: 'Command',
        utv: commandType,
        utt: time,
      })
      .send();
  }

  exception(error: string) {
    this.visitor
      .exception({
        exd: error,
      })
      .send();
  }

  featureUsed(feature: string) {
    this.visitor
      .event({
        ec: 'Feature',
        ea: feature,
      })
      .send();
  }

  workspaceType(workspaceType: string) {
    this.visitor
      .event({
        ec: 'WorkspaceType',
        ea: workspaceType,
        ev: 1,
      })
      .send();
  }
}
