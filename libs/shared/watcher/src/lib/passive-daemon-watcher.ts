import { getNxDaemonClient } from '@nx-console/shared-nx-workspace-info';
import { Logger } from '@nx-console/shared-utils';
import { randomUUID } from 'crypto';
import type { ProjectGraph } from 'nx/src/config/project-graph';
import type { ConfigurationSourceMaps } from 'nx/src/project-graph/utils/project-configuration-utils';
import {
  AnyEventObject,
  assign,
  createActor,
  fromPromise,
  not,
  setup,
} from 'xstate';

export type DaemonWatcherCallback = (
  error?: Error | null | 'closed' | 'reconnecting' | 'reconnected',
  projectGraphAndSourceMaps?: {
    projectGraph: ProjectGraph;
    sourceMaps: ConfigurationSourceMaps;
  } | null,
) => void;

type MachineContext = {
  attemptNumber: number;
  error: Error | null;
};

type MachineEvents =
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'LISTENER_ERROR'; error: Error | 'closed' }
  | { type: 'RESET_ATTEMPTS' };

export class PassiveDaemonWatcher {
  private listeners: Map<string, DaemonWatcherCallback> = new Map();
  private unregisterCallback: (() => void) | null = null;

  private machine = setup({
    types: {
      context: {} as MachineContext,
      events: {} as MachineEvents,
    },
    actions: {
      assignError: assign(({ event }) => {
        if (event.type === 'LISTENER_ERROR') {
          const error =
            event.error === 'closed'
              ? new Error('Daemon connection closed')
              : event.error;
          return { error };
        }
        return {};
      }),
      incrementAttempt: assign(({ context }) => ({
        attemptNumber: context.attemptNumber + 1,
      })),
      resetAttempts: assign(() => ({
        attemptNumber: 0,
        error: null,
      })),
      storeUnregisterCallback: ({ event }) => {
        this.unregisterCallback =
          ((event as AnyEventObject)['output'] as (() => void) | undefined) ??
          null;
      },
      cleanupListener: () => {
        if (this.unregisterCallback) {
          this.unregisterCallback();
          this.unregisterCallback = null;
        }
      },
      logTransition: ({ context }, params: { to: string }) => {
        this.logger.debug?.(
          `PassiveDaemonWatcher: transitioning to ${params.to} (attempt ${context.attemptNumber})`,
        );
      },
      notifyOperationalState: (_, params: { isOperational: boolean }) => {
        if (this.onOperationalStateChange) {
          this.onOperationalStateChange(params.isOperational);
        }
      },
      logPermanentFailure: ({ context }) => {
        this.logger.log(
          `PassiveDaemonWatcher: Failed to register daemon listener after ${context.attemptNumber} attempts. Giving up.`,
        );
      },
    },
    actors: {
      registerListener: fromPromise(async () => {
        const daemonClientModule = await getNxDaemonClient(
          this.workspacePath,
          this.logger,
        );

        if (!daemonClientModule) {
          throw new Error(
            'Nx Daemon client is not available. Make sure you are using a compatible version of Nx.',
          );
        }

        if (!daemonClientModule.daemonClient?.enabled()) {
          throw new Error('Nx Daemon client is not enabled.');
        }

        const unregister =
          await daemonClientModule.daemonClient.registerProjectGraphRecomputationListener(
            (
              error: Error | null | 'closed' | 'reconnecting' | 'reconnected',
              projectGraphAndSourceMaps: {
                projectGraph: ProjectGraph;
                sourceMaps: ConfigurationSourceMaps;
              } | null,
            ) => {
              if (error === 'reconnecting') {
                this.logger.debug?.(
                  'PassiveDaemonWatcher: Daemon connection reconnecting...',
                );
                return;
              }
              if (error === 'reconnected') {
                this.logger.debug?.(
                  'PassiveDaemonWatcher: Daemon connection reconnected',
                );
                return;
              }
              if (error) {
                this.actor.send({ type: 'LISTENER_ERROR', error });
              } else if (error === 'reconnecting' || error === 'reconnected') {
                this.listeners.forEach((listener) =>
                  listener(error, projectGraphAndSourceMaps),
                );
              } else {
                this.actor.send({ type: 'RESET_ATTEMPTS' });
                this.listeners.forEach((listener) =>
                  listener(error, projectGraphAndSourceMaps),
                );
              }
            },
          );

        return unregister;
      }),
    },
    guards: {
      canRetry: ({ context }) => context.attemptNumber < 5,
    },
    delays: {
      retryDelay: ({ context }) =>
        Math.min(2000 * Math.pow(2, context.attemptNumber - 1), 40000),
    },
  }).createMachine({
    id: 'passiveDaemonWatcher',
    initial: 'idle',
    context: {
      attemptNumber: 0,
      error: null,
    },
    states: {
      idle: {
        entry: [
          { type: 'logTransition', params: { to: 'idle' } },
          { type: 'notifyOperationalState', params: { isOperational: true } },
        ],
        on: {
          START: 'starting',
        },
      },
      starting: {
        entry: [
          'incrementAttempt',
          { type: 'logTransition', params: { to: 'starting' } },
          { type: 'notifyOperationalState', params: { isOperational: true } },
        ],
        invoke: {
          id: 'registerListener',
          src: 'registerListener',
          onDone: {
            target: 'listening',
            actions: ['storeUnregisterCallback'],
          },
          onError: {
            target: 'failed',
            actions: ['assignError'],
          },
        },
      },
      listening: {
        entry: [
          { type: 'logTransition', params: { to: 'listening' } },
          { type: 'notifyOperationalState', params: { isOperational: true } },
        ],
        on: {
          RESET_ATTEMPTS: {
            actions: ['resetAttempts'],
          },
          LISTENER_ERROR: {
            target: 'failed',
            actions: ['assignError'],
          },
          STOP: {
            target: 'idle',
            actions: ['cleanupListener'],
          },
        },
      },
      failed: {
        entry: [
          { type: 'logTransition', params: { to: 'failed' } },
          { type: 'notifyOperationalState', params: { isOperational: true } },
        ],
        always: [
          {
            guard: not('canRetry'),
            actions: [
              'logPermanentFailure',
              {
                type: 'notifyOperationalState',
                params: { isOperational: false },
              },
            ],
          },
        ],
        after: {
          retryDelay: [
            {
              guard: 'canRetry',
              target: 'starting',
            },
          ],
        },
        on: {
          STOP: {
            target: 'idle',
            actions: ['cleanupListener'],
          },
        },
      },
    },
  });

  private actor = createActor(this.machine);

  constructor(
    private workspacePath: string,
    private logger: Logger,
    private onOperationalStateChange?: (isOperational: boolean) => void,
  ) {
    this.actor.start();
  }

  listen(callback: DaemonWatcherCallback): () => void {
    const id = randomUUID();
    this.listeners.set(id, callback);
    return () => {
      this.listeners.delete(id);
    };
  }

  start() {
    this.actor.send({ type: 'START' });
  }

  stop() {
    this.actor.send({ type: 'STOP' });
  }

  get state() {
    return this.actor.getSnapshot().value;
  }

  dispose() {
    this.stop();
    this.listeners.clear();
    this.actor.stop();
  }
}
