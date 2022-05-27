import { Sink } from '../sink';
import { TelemetryType } from '../record';
import { User } from '../user';
import { TelemetryMessageBuilder } from '../message-builder';
import { initializeApp } from 'firebase/app';
import {
  getAnalytics,
  Analytics,
  setUserId,
  setUserProperties,
  logEvent,
} from 'firebase/analytics';
import { ExtensionContext, extensions } from 'vscode';

const app = initializeApp({
  apiKey: 'AIzaSyA-GKyx4NeDKx2-WikAbqmZ7PmoUi2xyDY',
  authDomain: 'nx-console.firebaseapp.com',
  projectId: 'nx-console',
  storageBucket: 'nx-console.appspot.com',
  messagingSenderId: '482317143702',
  appId: '1:482317143702:web:73752de7bf0fbb6fcb3cb7',
  measurementId: 'G-9GC6FQ9WV1',
});

// increment this if there is substancial changes to the schema,
// and you want to create a new view that only has this data
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
  analytics: Analytics;

  get enabled() {
    return this.user.state !== 'untracked';
  }

  constructor(readonly user: User) {
    this.analytics = getAnalytics(app);

    this.setPersistentParams();
  }

  setPersistentParams() {
    setUserId(this.analytics, this.user.id, {
      global: true,
    });

    setUserProperties(this.analytics, {
      state: this.user.state,
      version: extensions.getExtension('nrwl.angular-console')?.packageJSON
        .version,
      platform: 'vscode',
    });
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
    logEvent(this.analytics, 'application', {
      value: 'activated',
      timing: time,
    });
  }

  extensionDeactivated(): void {
    logEvent(this.analytics, 'application', {
      value: 'deactivated',
    });
  }

  startedTracking(): void {
    logEvent(this.analytics, 'data_collection', {
      value: 'opt-in',
    });
  }

  stoppedTracking(): void {
    logEvent(this.analytics, 'data_collection', {
      value: 'opt-out',
    });
  }

  screenViewed(screen: string): void {
    logEvent(this.analytics, 'screen_view', {
      firebase_screen: screen,
      firebase_screen_class: screen,
      value: screen,
    });
  }

  commandRun(commandType: string, time: number): void {
    logEvent(this.analytics, 'command_run', {
      value: commandType,
      timing: time,
    });
  }

  exception(error: string) {
    logEvent(this.analytics, 'exception', {
      description: error,
    });
  }

  featureUsed(feature: string) {
    logEvent(this.analytics, 'feature_used', {
      value: feature,
    });
  }

  workspaceType(workspaceType: string) {
    logEvent(this.analytics, 'workspace_type', {
      workspaceType,
    });
  }
}
