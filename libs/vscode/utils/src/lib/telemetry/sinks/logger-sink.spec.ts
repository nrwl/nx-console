import { TelemetryType } from '../record';
import { header,LoggerSink, LogWriter } from './logger-sink';

describe('Telemetry: Logger Sink', () => {
  const type: TelemetryType = 'CommandRun';
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
