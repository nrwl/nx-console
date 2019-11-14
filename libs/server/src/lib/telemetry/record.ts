export type TelemetryType =
  | 'ExtensionActivated'
  | 'ExtensionDeactivated'
  | 'StoppedTracking'
  | 'StartedTracking'
  | 'ScreenViewed'
  | 'CommandRun'
  | 'ExceptionOccurred'
  | 'FeatureUsed'
  | 'UserStateChanged';

export function isTelemetryRecord(evt: string): evt is TelemetryType {
  return new Set([
    'ExtensionActivated',
    'ExtensionDeactivated',
    'StoppedTracking',
    'StartedTracking',
    'ScreenViewed',
    'CommandRun',
    'ExceptionOccurred',
    'FeatureUsed',
    'UserStateChanged'
  ]).has(evt);
}
