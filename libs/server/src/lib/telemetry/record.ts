export type TelemetryType =
  | 'AppLoaded'
  | 'LoggedIn'
  | 'LoggedOut'
  | 'StoppedTracking'
  | 'StartedTracking'
  | 'ScreenViewed'
  | 'CommandRun'
  | 'ExceptionOccurred'
  | 'FeatureUsed'
  | 'UserStateChanged';

export function isTelemetryRecord(evt: string): evt is TelemetryType {
  return new Set([
    'AppLoaded',
    'LoggedIn',
    'LoggedOut',
    'StoppedTracking',
    'StartedTracking',
    'ScreenViewed',
    'CommandRun',
    'ExceptionOccurred',
    'FeatureUsed',
    'UserStateChanged'
  ]).has(evt);
}
