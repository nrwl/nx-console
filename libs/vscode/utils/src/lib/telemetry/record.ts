export type TelemetryType =
  | 'ExtensionActivated'
  | 'ExtensionDeactivated'
  | 'FeatureUsed';

export function isTelemetryRecord(evt: string): evt is TelemetryType {
  return new Set([
    'ExtensionActivated',
    'ExtensionDeactivated',
    'FeatureUsed',
  ]).has(evt);
}
