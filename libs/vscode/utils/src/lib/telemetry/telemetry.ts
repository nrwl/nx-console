import { TelemetryType } from './record';
import { Sink } from './sink';
import { LoggerSink, GoogleAnalyticsSink } from './sinks';
import { TelemetryMessageBuilder } from './message-builder';

export class Telemetry implements TelemetryMessageBuilder {
  readonly sinks: Sink[] = [];

  static withGoogleAnalytics(): Telemetry {
    const instance = new Telemetry();
    const sink = new GoogleAnalyticsSink();
    instance.addSink(sink);
    return instance;
  }

  static withLogger(): Telemetry {
    const instance = new Telemetry();
    const sink = new LoggerSink();
    instance.addSink(sink);
    return instance;
  }

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
