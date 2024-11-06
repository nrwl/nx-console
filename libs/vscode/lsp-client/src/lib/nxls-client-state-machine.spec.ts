import { createActor, fromPromise, waitFor } from 'xstate';
import { nxlsClientStateMachine } from './nxls-client-state-machine';

const defaultStart = jest.fn().mockReturnValue(1111);
const defaultStop = jest.fn();
const defaultImplementation = {
  actors: {
    startClient: fromPromise(
      async ({ input }: { input: { workspacePath: string | undefined } }) => {
        return await defaultStart(input.workspacePath);
      }
    ),
    stopClient: fromPromise(async () => {
      return defaultStop();
    }),
  },
};
describe('Nxls Client State Machine', () => {
  it('should render idle initially', () => {
    const actor = createActor(
      nxlsClientStateMachine.provide(defaultImplementation)
    );
    actor.start();

    expect(actor.getSnapshot().matches('idle')).toBe(true);
  });

  it('should start client', async () => {
    const actor = createActor(
      nxlsClientStateMachine.provide(defaultImplementation)
    );
    actor.start();

    actor.send({ type: 'START', value: 'workspacePath' });

    expect(actor.getSnapshot().value).toBe('starting');
    await waitFor(actor, (snapshot) => snapshot.matches('running'));
    expect(actor.getSnapshot().value).toBe('running');
    expect(defaultStart).toHaveBeenCalledWith('workspacePath');
  });

  it('should stop client', async () => {
    const actor = createActor(
      nxlsClientStateMachine.provide(defaultImplementation)
    );
    actor.start();
    actor.send({ type: 'START', value: 'workspacePath' });

    await waitFor(actor, (snapshot) => snapshot.matches('running'));

    actor.send({ type: 'STOP' });

    expect(actor.getSnapshot().value).toBe('stopping');
    await waitFor(actor, (snapshot) => snapshot.matches('idle'));
    expect(actor.getSnapshot().value).toBe('idle');
    expect(defaultStop).toHaveBeenCalled();
  });

  it('should assign workspace path if the machine is idle', () => {
    const actor = createActor(
      nxlsClientStateMachine.provide(defaultImplementation)
    );
    actor.start();

    actor.send({ type: 'SET_WORKSPACE_PATH', value: 'workspacePath' });

    expect(actor.getSnapshot().context.workspacePath).toBe('workspacePath');
  });

  it('should assign & send workspace change event if machine is running', async () => {
    const sendFn = jest.fn();
    const actor = createActor(
      nxlsClientStateMachine.provide({
        ...defaultImplementation,
        actions: {
          sendRefreshNotification: ({ context }) =>
            sendFn(context.workspacePath),
        },
      })
    );
    actor.start();
    actor.send({ type: 'START', value: 'workspacePath' });

    await waitFor(actor, (snapshot) => snapshot.matches('running'));

    actor.send({ type: 'SET_WORKSPACE_PATH', value: 'newPath' });

    expect(actor.getSnapshot().context.workspacePath).toBe('newPath');
    expect(sendFn).toHaveBeenCalledWith('newPath');
  });
});
