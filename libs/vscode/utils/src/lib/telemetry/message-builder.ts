export interface TelemetryMessageBuilder {
  extensionActivated(time: number): void;
  extensionDeactivated(time: number): void;
  featureUsed(feature: string, details: object): void;
}
