import { MemorySink } from './sinks';
import { Telemetry } from './telemetry';
import { TelemetryType } from './record';
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

      telemetry.appLoaded(time);

      const written = sink.oneRecord();

      expect(written).toEqual({ type: 'AppLoaded', data: { time } });
    });

    it('records logged in events', () => {
      telemetry.state = 'anonymous';
      telemetry.loggedIn();

      const loggedIn = sink.oneRecord('LoggedIn');
      const stateChanged = sink.oneRecord('UserStateChanged');

      expect(loggedIn).toEqual({ type: 'LoggedIn', data: {} });
      expect(stateChanged).toEqual({
        type: 'UserStateChanged',
        data: { state: 'connected' }
      });
    });

    it('records logged out events', () => {
      telemetry.state = 'connected';
      telemetry.loggedOut();

      const loggedOut = sink.oneRecord('LoggedOut');
      const stateChanged = sink.oneRecord('UserStateChanged');

      expect(loggedOut).toEqual({ type: 'LoggedOut', data: {} });
      expect(stateChanged).toEqual({
        type: 'UserStateChanged',
        data: { state: 'anonymous' }
      });
    });

    it('records starting telemetry tracking', () => {
      telemetry.state = 'untracked';
      telemetry.startedTracking();

      const tracked = sink.oneRecord('StartedTracking');
      const stateChanged = sink.oneRecord('UserStateChanged');

      expect(tracked).toEqual({ type: 'StartedTracking', data: {} });
      expect(stateChanged).toEqual({
        type: 'UserStateChanged',
        data: { state: 'anonymous' }
      });
    });

    it('records halting telemetry tracking', () => {
      telemetry.state = 'anonymous';
      telemetry.stoppedTracking();

      const untracked = sink.oneRecord('StoppedTracking');
      const stateChanged = sink.oneRecord('UserStateChanged');

      expect(untracked).toEqual({ type: 'StoppedTracking', data: {} });
      expect(stateChanged).toEqual({
        type: 'UserStateChanged',
        data: { state: 'untracked' }
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
        data: { commandType, time }
      });
    });

    it('records exceptions', () => {
      const error = 'error';

      telemetry.exceptionOccured(error);

      const written = sink.oneRecord();

      expect(written).toEqual({
        type: 'ExceptionOccurred',
        data: { error }
      });
    });

    it('records feature use', () => {
      const feature = 'feature';

      telemetry.featureUsed(feature);

      const written = sink.oneRecord();

      expect(written).toEqual({
        type: 'FeatureUsed',
        data: { feature }
      });
    });
  });
});
