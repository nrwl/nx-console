import { TelemetryType } from './record';

export interface Sink {
  record(type: TelemetryType, data: any): void;
}
