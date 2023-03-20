export interface TelemetryMessageBuilder {
  extensionActivated(time: number): void;
  extensionDeactivated(time: number): void;
  screenViewed(screen: string): void;
  commandRun(commandType: string, time: number): void;
  exception(error: string): void;
  featureUsed(feature: string): void;
}
