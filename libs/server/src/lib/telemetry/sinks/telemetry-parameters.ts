import { TelemetryType } from '../record';

export class TelemetryParameters {
  constructor(
    private readonly type: TelemetryType,
    private readonly params: any
  ) {}

  fetch(key: string): any {
    this.require(key);
    return this.params[key];
  }

  require(key: string): void {
    if (!this.params.hasOwnProperty(key)) {
      throw new Error(
        `Telemetry ${this.type} does not have a parameter of ${key}`
      );
    }
  }
}
