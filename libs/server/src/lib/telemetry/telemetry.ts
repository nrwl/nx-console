import { TelemetryType } from './record';
import { Sink } from './sink';
import { LoggerSink, GoogleAnalyticsSink, ApplicationPlatform } from './sinks';
import { User, UserState } from './user';
import { TelemetryMessageBuilder } from './message-builder';
import { Store } from '../stores';

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
    this.sinks.forEach((s) => s.record(type, data));
  }

  extensionActivated(timeInSeconds: number): void {
    this.record('ExtensionActivated', { time: timeInSeconds });
  }

  extensionDeactivated(): void {
    this.record('ExtensionDeactivated');
  }

  startedTracking(): void {
    this.user.tracked();
    this.userStateChanged();
    this.record('StartedTracking');
  }

  stoppedTracking(): void {
    // Record event before disabling data collection.
    // Otherwise we won't get the opt-out event.
    this.record('StoppedTracking');

    this.user.untracked();
    this.userStateChanged();
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

  exception(error: string): void {
    this.record('ExceptionOccurred', { error });
  }

  featureUsed(feature: string): void {
    this.record('FeatureUsed', { feature });
  }
}
