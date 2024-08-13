import { getOutputChannel } from '@nx-console/vscode/output-channels';
import { TelemetryLogger, TelemetrySender, env } from 'vscode';
import { GoogleAnalyticsSender } from './google-analytics-sender';
import { LoggerSender } from './logger-sender';

let telemetry: TelemetryLogger;

export function getTelemetry() {
  return telemetry;
}

// using shared memory here is a shortcut, this should be an api call
export function initTelemetry(production: boolean) {
  const telemetrySender: TelemetrySender = production
    ? new GoogleAnalyticsSender(production)
    : new LoggerSender();

  telemetry = env.createTelemetryLogger(telemetrySender, {
    ignoreUnhandledErrors: true,
    ignoreBuiltInCommonProperties: true,
  });

  getOutputChannel().appendLine(
    `Telemetry: ${production ? 'production' : 'development'}`
  );
  // telemetry = production
  //   ? Telemetry.withGoogleAnalytics(production)
  //   : Telemetry.withLogger();

  // return telemetry;
}
