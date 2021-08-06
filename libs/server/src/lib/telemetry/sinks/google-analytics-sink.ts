import { Sink } from '../sink';
import { TelemetryType } from '../record';
import { User } from '../user';
import { TelemetryMessageBuilder } from '../message-builder';

// increment this if there is substancial changes to the schema,
// and you want to create a new view that only has this data
const ANALYTICS_VERSION = 2;
const TRACKING_ID = 'UA-88380372-8';
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

export class GoogleAnalyticsSink implements Sink, TelemetryMessageBuilder {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  visitor = require('universal-analytics')(TRACKING_ID, {
    uid: this.user.id,
  });

  get enabled() {
    return this.user.state !== 'untracked';
  }

  constructor(readonly user: User, readonly platform: ApplicationPlatform) {
    this.setPersistentParams();
  }

  setPersistentParams() {
    this.visitor.set('uid', this.user.id);
    this.visitor.set('ds', 'app');
    this.visitor.set('cd1', this.user.state);
    this.visitor.set('cd2', this.platform);
    this.visitor.set('cd3', ANALYTICS_VERSION);
  }

  record(type: TelemetryType, data: any): void {
    if (!this.enabled) return;
    const params = new TelemetryParams(type, data);

    switch (type) {
      case 'UserStateChanged':
        this.user.state = params.fetch('state');
        this.setPersistentParams();
        break;
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
