import { Telemetry } from './telemetry';

let telemetry: Telemetry;

export function getTelemetry() {
  return telemetry;
}

// using shared memory here is a shortcut, this should be an api call
export function initTelemetry(production: boolean) {
  telemetry = production
    ? Telemetry.withGoogleAnalytics(production)
    : Telemetry.withLogger();

  return telemetry;
}
