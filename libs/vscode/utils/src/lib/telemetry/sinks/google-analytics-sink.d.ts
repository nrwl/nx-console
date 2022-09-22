import { Sink } from '../sink';
import { TelemetryType } from '../record';
import { User } from '../user';
import { TelemetryMessageBuilder } from '../message-builder';
import type { Visitor } from 'universal-analytics';
export declare type ApplicationPlatform = 'vscode';
export declare class GoogleAnalyticsSink implements Sink, TelemetryMessageBuilder {
    readonly user: User;
    readonly platform: ApplicationPlatform;
    visitor: Visitor;
    get enabled(): boolean;
    constructor(user: User, platform: ApplicationPlatform);
    setPersistentParams(): void;
    record(type: TelemetryType, data: any): void;
    extensionActivated(time: number): void;
    extensionDeactivated(): void;
    startedTracking(): void;
    stoppedTracking(): void;
    screenViewed(screen: string): void;
    commandRun(commandType: string, time: number): void;
    exception(error: string): void;
    featureUsed(feature: string): void;
    workspaceType(workspaceType: string): void;
}
