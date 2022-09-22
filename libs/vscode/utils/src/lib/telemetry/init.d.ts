import { Telemetry } from './telemetry';
import { Store } from '@nx-console/shared/schema';
export declare function getTelemetry(): Telemetry;
export declare function initTelemetry(store: Store, production: boolean): Telemetry;
export declare function teardownTelemetry(): void;
