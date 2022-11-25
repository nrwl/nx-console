import { TelemetryType } from '../record';
import { MemorySink } from './memory-sink';

describe('Telemetry: MemorySink', () => {
  const type: TelemetryType = 'ScreenViewed';
  const data = 'data';
  const record = { type, data };
  let sink: MemorySink;

  beforeEach(() => {
    sink = new MemorySink();
  });

  it('records into memory', () => {
    sink.record(type, data);

    expect(sink.records).toEqual([record]);
  });

  it('can tell when records are recorded', () => {
    sink.record(type, data);

    const recorded = sink.hasRecord();

    expect(recorded).toBe(true);
  });

  it('can tell when records have not been recorded', () => {
    const recorded = sink.hasRecord();

    expect(recorded).toBe(false);
  });

  it('can tell when type of record has been recorded', () => {
    sink.record(type, data);

    const recorded = sink.hasRecord(type);

    expect(recorded).toBe(true);
  });

  it('retrieves records by type', () => {
    sink.record(type, data);

    const records = sink.recordsByType(type);

    expect(records).toEqual([record]);
  });

  it('does not include records by when type does not match', () => {
    sink.record('CommandRun', data);

    const records = sink.recordsByType(type);

    expect(records).toHaveLength(0);
  });

  it('retrieves one record', () => {
    sink.record(type, data);

    const result = sink.oneRecord();

    expect(result).toEqual(record);
  });

  it('retrieves one record by type', () => {
    sink.record(type, data);

    const result = sink.oneRecord(type);

    expect(result).toEqual(record);
  });

  it('errors retrieving one record, if records do not match type', () => {
    sink.record(type, data);

    expect(() => sink.oneRecord('CommandRun')).toThrowError();
  });

  it('errors retrieving one record, if there is more then one', () => {
    sink.record(type, data);
    sink.record(type, data);

    expect(() => sink.oneRecord()).toThrowError();
  });

  it('errors retrieving one record, if records are empty', () => {
    expect(() => sink.oneRecord()).toThrowError();
  });
});
