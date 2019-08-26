export interface TelemetryMessageBuilder {
  appLoaded(time: number): void;
  loggedIn(): void;
  loggedOut(): void;
  startedTracking(): void;
  stoppedTracking(): void;
  screenViewed(screen: string): void;
  commandRun(commandType: string, time: number): void;
  exceptionOccured(error: string): void;
  featureUsed(feature: string): void;
}
