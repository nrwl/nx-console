import { TelemetrySender } from 'vscode';

function header(type: string): string {
  return `[Telemetry ${type}]`;
}

function errorHeader(type: string): string {
  return `[Telemetry Error ${type}]`;
}

export class LoggerSender implements TelemetrySender {
  sendEventData(eventName: string, data?: Record<string, any>): void {
    console.log(header(eventName), data);
  }
  sendErrorData(error: Error, data?: Record<string, any>): void {
    console.log(errorHeader(error.name), data);
  }
}
