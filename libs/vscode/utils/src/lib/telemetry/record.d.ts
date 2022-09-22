export declare type TelemetryType = 'ExtensionActivated' | 'ExtensionDeactivated' | 'StoppedTracking' | 'StartedTracking' | 'ScreenViewed' | 'CommandRun' | 'ExceptionOccurred' | 'FeatureUsed' | 'UserStateChanged' | 'WorkspaceType';
export declare function isTelemetryRecord(evt: string): evt is TelemetryType;
