import { Sink } from '../sink';
import { TelemetryType } from '../record';
export declare class MemorySink implements Sink {
    records: Record[];
    record(type: TelemetryType, data: any): void;
    recordsByType(type: TelemetryType): Record[];
    oneRecord(type?: TelemetryType): Record;
    hasRecord(type?: TelemetryType): boolean;
}
interface Record {
    type: TelemetryType;
    data: any;
}
export {};
