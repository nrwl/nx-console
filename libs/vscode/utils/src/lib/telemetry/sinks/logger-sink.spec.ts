import { LoggerSink, LogWriter, header } from './logger-sink';
import { TelemetryType } from '../record';

describe('Telemetry: Logger Sink', () => {
  const type: TelemetryType = 'FeatureUsed';
  const data = 'data';

  let sink: LoggerSink;
  let writer: LogWriter;

  beforeEach(() => {
    writer = { log: jest.fn() };
    sink = new LoggerSink(writer);
  });

  it('logs records with formatted header', () => {
    const expected = header(type);

    sink.record(type, data);

    expect(writer.log).toHaveBeenCalledWith(expected, data);
  });
});
