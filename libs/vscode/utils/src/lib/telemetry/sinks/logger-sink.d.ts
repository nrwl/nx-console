import { Sink } from '../sink';
import { TelemetryType } from '../record';
export interface LogWriter {
    log(...messages: any[]): void;
}
export declare function header(type: string): string;
export declare class LoggerSink implements Sink {
    private readonly writer;
    constructor(writer?: LogWriter);
    record(type: TelemetryType, data: any): void;
}
