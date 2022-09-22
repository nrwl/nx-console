import { TelemetryType } from './record';
import { Sink } from './sink';
import { ApplicationPlatform } from './sinks';
import { User, UserState } from './user';
import { TelemetryMessageBuilder } from './message-builder';
import { Store } from '@nx-console/shared/schema';
export declare class Telemetry implements TelemetryMessageBuilder {
    private readonly user;
    readonly sinks: Sink[];
    state: UserState;
    static withGoogleAnalytics(store: Store, platform: ApplicationPlatform): Telemetry;
    static withLogger(store: Store): Telemetry;
    constructor(user: User);
    addSink(sink: Sink): void;
    record(type: TelemetryType, data?: any): void;
    extensionActivated(timeInSeconds: number): void;
    extensionDeactivated(): void;
    startedTracking(): void;
    stoppedTracking(): void;
    userStateChanged(): void;
    screenViewed(screen: string): void;
    commandRun(commandType: string, time: number): void;
    exception(error: string): void;
    featureUsed(feature: string): void;
}
