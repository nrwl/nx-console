import { TelemetryType } from './record';
import { Sink } from './sink';
import { LoggerSink, GoogleAnalyticsSink, ApplicationPlatform } from './sinks';
import { User, UserState } from './user';
import { TelemetryMessageBuilder } from './message-builder';
import { Store } from '@angular-console/server';

export class Telemetry implements TelemetryMessageBuilder {
  readonly sinks: Sink[] = [];
  state: UserState = this.user.state;

  static withGoogleAnalytics(
    store: Store,
    platform: ApplicationPlatform
  ): Telemetry {
    const user = User.fromStorage(store);
    const instance = new Telemetry(user);
    const sink = new GoogleAnalyticsSink(user, platform);
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

  extensionActivated(time: number): void {
    this.record('ExtensionActivated', { time });
  }

  extensionDeactivated(time: number): void {
    this.record('ExtensionDeactivated', { time });
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

  exceptionOccured(error: string): void {
    this.record('ExceptionOccurred', { error });
  }

  featureUsed(feature: string): void {
    this.record('FeatureUsed', { feature });
  }
}
