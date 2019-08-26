import { TelemetryType } from './record';
import { Sink } from './sink';
import { LoggerSink, GoogleAnalyticsSink } from './sinks';
import { User, UserState } from './user';
import { ApplicationPlatform } from '@angular-console/environment';
import { TelemetryMessageBuilder } from './message-builder';
import { seconds } from '../utils/utils';
import { RunResult } from '../api/executable';
import { Store } from '@nrwl/angular-console-enterprise-electron';

export class Telemetry implements TelemetryMessageBuilder {
  readonly sinks: Sink[] = [];
  state: UserState = this.user.state;

  static withGoogleAnalytics(
    store: Store,
    platform: ApplicationPlatform
  ): Telemetry {
    const user = User.fromStorage(store);
    const instance = new Telemetry(user);
    const sink = new GoogleAnalyticsSink(user.id, platform, user.state);
    instance.addSink(sink);
    return instance;
  }

  static withLogger(store: Store): Telemetry {
    const user = User.fromStorage(store);
    const instance = new Telemetry(user);
    const sink = new LoggerSink();
    instance.addSink(sink);
    return instance;
  }

  constructor(private readonly user: User) {}

  addSink(sink: Sink) {
    this.sinks.push(sink);
  }

  record(type: TelemetryType, data: any = {}): void {
    this.sinks.forEach(s => s.record(type, data));
  }

  appLoaded(time: number): void {
    this.record('AppLoaded', { time });
  }

  loggedIn(): void {
    this.user.loggedIn();
    this.userStateChanged();
    this.record('LoggedIn');
  }

  loggedOut(): void {
    this.user.loggedOut();
    this.userStateChanged();
    this.record('LoggedOut');
  }

  startedTracking(): void {
    this.user.tracked();
    this.userStateChanged();
    this.record('StartedTracking');
  }

  stoppedTracking(): void {
    this.user.untracked();
    this.userStateChanged();
    this.record('StoppedTracking');
  }

  userStateChanged() {
    if (this.state !== this.user.state) {
      this.state = this.user.state;
      this.record('UserStateChanged', { state: this.user.state });
    }
  }

  screenViewed(screen: string): void {
    this.record('ScreenViewed', { screen });
  }

  commandRun(commandType: string, time: number): void {
    this.record('CommandRun', { commandType, time });
  }

  timedCommandRun(commandType: string, run: Function): RunResult {
    const [time, result] = seconds(run);
    this.commandRun(commandType, time);
    return result;
  }

  exceptionOccured(error: string): void {
    this.record('ExceptionOccurred', { error });
  }

  featureUsed(feature: string): void {
    this.record('FeatureUsed', { feature });
  }
}
