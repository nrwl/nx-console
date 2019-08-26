import { Sink } from '../sink';
import { TelemetryType } from '../record';
import { UserState } from '../user';
import { ApplicationPlatform } from '@angular-console/environment';
import { TelemetryMessageBuilder } from '../message-builder';

// increment this if there is substancial changes to the schema,
// and you want to create a new view that only has this data
const ANALYTICS_VERSION = 2;
const TRACKING_ID = 'UA-88380372-8';

class TelemetryParams {
  constructor(readonly type: string, readonly data: any) {}

  fetch(key: string): any {
    this.require(key);
    return this.data[key];
  }

  require(key: string) {
    const msg = `Telemetry: ${this.type} is missing ${key}`;
    if (!this.data.hasOwnProperty(key)) {
      throw new Error(msg);
    }
  }
}

export class GoogleAnalyticsSink implements Sink, TelemetryMessageBuilder {
  visitor = require('universal-analytics')(TRACKING_ID, {
    uid: this.userId
  });

  get enabled() {
    return this.state !== 'untracked';
  }

  constructor(
    readonly userId: string,
    readonly platform: ApplicationPlatform,
    public state: UserState
  ) {
    this.setPersistentParams();
  }

  setPersistentParams() {
    this.visitor.set('uid', this.userId);
    this.visitor.set('ds', 'app');
    this.visitor.set('cd1', this.state);
    this.visitor.set('cd2', this.platform);
    this.visitor.set('cd3', ANALYTICS_VERSION);
  }

  record(type: TelemetryType, data: any): void {
    if (!this.enabled) return;
    const params = new TelemetryParams(type, data);

    switch (type) {
      case 'UserStateChanged':
        this.state = params.fetch('state');
        this.setPersistentParams();
        break;
      case 'AppLoaded':
        this.appLoaded(params.fetch('time'));
        break;
      case 'LoggedIn':
        this.loggedIn();
        break;
      case 'LoggedOut':
        this.loggedOut();
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
        this.exceptionOccured(params.fetch('error'));
        break;
      case 'FeatureUsed':
        this.featureUsed(params.fetch('feature'));
        break;
      default:
        throw new Error(`Unknown Telemetry type: ${type}`);
    }
  }

  appLoaded(time: number): void {
    this.visitor
      .timing({
        utc: 'Application',
        utv: 'Load Time',
        utt: time
      })
      .send();
  }

  loggedIn(): void {
    this.visitor
      .event({
        ec: 'NRWL Connect',
        ea: 'Connected'
      })
      .send();
  }

  loggedOut(): void {
    this.visitor
      .event({
        ec: 'NRWL Connect',
        ea: 'Disconnected'
      })
      .send();
  }

  startedTracking(): void {
    this.visitor
      .event({
        ec: 'Data Collection',
        ea: 'Opt In'
      })
      .send();
  }

  stoppedTracking(): void {
    this.visitor
      .event({
        ec: 'Data Collection',
        ea: 'Opt Out'
      })
      .send();
  }

  screenViewed(screen: string): void {
    this.visitor
      .screenview({
        an: 'Angular Console',
        cd: screen
      })
      .send();
  }

  commandRun(commandType: string, time: number): void {
    this.visitor
      .timing({
        utc: 'Command',
        utv: commandType,
        utt: time
      })
      .send();
  }

  exceptionOccured(error: string) {
    this.visitor
      .exception({
        exd: error
      })
      .send();
  }

  featureUsed(feature: string) {
    this.visitor
      .event({
        ec: 'Feature',
        ea: feature
      })
      .send();
  }
}
