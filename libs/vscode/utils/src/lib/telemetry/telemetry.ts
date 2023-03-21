import { TelemetryType } from './record';
import { Sink } from './sink';
import { LoggerSink, GoogleAnalyticsSink } from './sinks';
import { TelemetryMessageBuilder } from './message-builder';

export class Telemetry implements TelemetryMessageBuilder {
  readonly sinks: Sink[] = [];

  static withGoogleAnalytics(production: boolean): Telemetry {
    const instance = new Telemetry();
    const sink = new GoogleAnalyticsSink(production);
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

  featureUsed(feature: string): void {
    this.record('FeatureUsed', { feature });
  }
}
