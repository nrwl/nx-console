import { TelemetryType } from './record';
import { MemorySink } from './sinks';
import { Telemetry } from './telemetry';
import { User } from './user';

describe('Telemetry', () => {
  const type: TelemetryType = 'CommandRun';
  const data = 'data';
  const record = { type, data };
  const userId = 'user';
  let user: User;

  let telemetry: Telemetry;
  let sink: MemorySink;

  beforeEach(() => {
    user = new User(userId);
    telemetry = new Telemetry(user);
    sink = new MemorySink();
    telemetry.addSink(sink);
  });

  it('records to sink when recording telemetry', () => {
    telemetry.record(type);

    const written = sink.oneRecord();

    expect(written).toEqual({ type, data: {} });
  });

  it('records data to sink', () => {
    telemetry.record(type, data);

    const written = sink.oneRecord();

    expect(written).toEqual(record);
  });

  describe('factory methods', () => {
    it('records loading times', () => {
      const time = 25;

      telemetry.extensionActivated(time);

      const written = sink.oneRecord();

      expect(written).toEqual({ type: 'ExtensionActivated', data: { time } });
    });

    it('records starting telemetry tracking', () => {
      telemetry.state = 'untracked';
      telemetry.startedTracking();

      const tracked = sink.oneRecord('StartedTracking');
      const stateChanged = sink.oneRecord('UserStateChanged');

      expect(tracked).toEqual({ type: 'StartedTracking', data: {} });
      expect(stateChanged).toEqual({
        type: 'UserStateChanged',
        data: { state: 'tracked' },
      });
    });

    it('records halting telemetry tracking', () => {
      telemetry.state = 'tracked';
      telemetry.stoppedTracking();

      const untracked = sink.oneRecord('StoppedTracking');
      const stateChanged = sink.oneRecord('UserStateChanged');

      expect(untracked).toEqual({ type: 'StoppedTracking', data: {} });
      expect(stateChanged).toEqual({
        type: 'UserStateChanged',
        data: { state: 'untracked' },
      });
    });

    it('records screen views', () => {
      const screen = 'screen';
      telemetry.screenViewed(screen);

      const written = sink.oneRecord();

      expect(written).toEqual({ type: 'ScreenViewed', data: { screen } });
    });

    it('records command timings', () => {
      const commandType = 'command';
      const time = 25;

      telemetry.commandRun(commandType, time);

      const written = sink.oneRecord();

      expect(written).toEqual({
        type: 'CommandRun',
        data: { commandType, time },
      });
    });

    it('records exceptions', () => {
      const error = 'error';

      telemetry.exception(error);

      const written = sink.oneRecord();

      expect(written).toEqual({
        type: 'ExceptionOccurred',
        data: { error },
      });
    });

    it('records feature use', () => {
      const feature = 'feature';

      telemetry.featureUsed(feature);

      const written = sink.oneRecord();

      expect(written).toEqual({
        type: 'FeatureUsed',
        data: { feature },
      });
    });
  });
});
