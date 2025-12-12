import {
  ExtensionContext,
  ExtensionMode,
  TelemetryLogger,
  TelemetrySender,
  env,
} from 'vscode';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { GoogleAnalyticsSender } from './google-analytics-sender';
import { LoggerSender } from './logger-sender';
import {
  TelemetryData,
  TelemetryEvents,
  NxConsoleTelemetryLogger as NxConsoleTelemetryLoggerBase,
} from '@nx-console/shared-telemetry';

let telemetry: NxConsoleTelemetryLogger;

export function getTelemetry() {
  return telemetry;
}

export function initTelemetry(context: ExtensionContext) {
  const production = context.extensionMode === ExtensionMode.Production;
  const telemetrySender: TelemetrySender = production
    ? new GoogleAnalyticsSender(production, context)
    : new LoggerSender();

  telemetry = env.createTelemetryLogger(telemetrySender, {
    ignoreBuiltInCommonProperties: true,
  });

  vscodeLogger.log(`Telemetry: ${production ? 'production' : 'development'}`);
}

export interface NxConsoleTelemetryLogger
  extends TelemetryLogger,
    NxConsoleTelemetryLoggerBase {
  logUsage(eventName: TelemetryEvents, data?: TelemetryData): void;
}
