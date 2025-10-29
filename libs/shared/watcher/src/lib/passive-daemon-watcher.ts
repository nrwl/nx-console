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
  setup,
} from 'xstate';

export type DaemonWatcherCallback = (
  error?: Error | null | 'closed',
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
        this.logger.log(
          `PassiveDaemonWatcher: transitioning to ${params.to} (attempt ${context.attemptNumber})`,
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
              error: Error | null | 'closed',
              projectGraphAndSourceMaps: {
                projectGraph: ProjectGraph;
                sourceMaps: ConfigurationSourceMaps;
              } | null,
            ) => {
              if (error) {
                this.listeners.forEach((listener) => listener(error));
                this.actor.send({ type: 'LISTENER_ERROR', error });
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
      canRetry: ({ context }) => context.attemptNumber <= 5,
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
        entry: { type: 'logTransition', params: { to: 'idle' } },
        on: {
          START: 'starting',
        },
      },
      starting: {
        entry: { type: 'logTransition', params: { to: 'starting' } },
        invoke: {
          id: 'registerListener',
          src: 'registerListener',
          onDone: {
            target: 'listening',
            actions: ['storeUnregisterCallback'],
          },
          onError: {
            target: 'failed',
            actions: ['assignError', 'incrementAttempt'],
          },
        },
      },
      listening: {
        entry: { type: 'logTransition', params: { to: 'listening' } },
        on: {
          RESET_ATTEMPTS: {
            actions: ['resetAttempts'],
          },
          LISTENER_ERROR: {
            target: 'failed',
            actions: ['assignError', 'incrementAttempt'],
          },
          STOP: {
            target: 'idle',
            actions: ['cleanupListener'],
          },
        },
      },
      failed: {
        entry: { type: 'logTransition', params: { to: 'failed' } },
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
