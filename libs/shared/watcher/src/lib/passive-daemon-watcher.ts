import { getNxDaemonClient } from '@nx-console/shared-nx-workspace-info';
import { Logger } from '@nx-console/shared-utils';
import { randomUUID } from 'crypto';
import type { ProjectGraph } from 'nx/src/config/project-graph';
import type { ConfigurationSourceMaps } from 'nx/src/project-graph/utils/project-configuration-utils';
import { AnyEventObject, createActor, fromPromise, setup } from 'xstate';

export type DaemonWatcherCallback = (
  error?: Error | null | 'closed' | 'reconnecting' | 'reconnected',
  projectGraphAndSourceMaps?: {
    projectGraph: ProjectGraph;
    sourceMaps: ConfigurationSourceMaps;
  } | null,
) => void;

type MachineEvents =
  | { type: 'START' }
  | { type: 'STOP' }
  | {
      type: 'LISTENER_ERROR';
      error: Error | 'closed' | 'reconnecting' | 'reconnected';
    };

export class PassiveDaemonWatcher {
  private listeners: Map<string, DaemonWatcherCallback> = new Map();
  private unregisterCallback: (() => void) | null = null;

  private machine = setup({
    types: {
      events: {} as MachineEvents,
    },
    actions: {
      storeUnregisterCallback: ({ event }) => {
        this.unregisterCallback =
          ((event as AnyEventObject)['output'] as (() => void) | undefined) ??
          null;
      },
      cleanupListener: () => {
        if (this.unregisterCallback) {
          this.logger.debug?.(
            'PassiveDaemonWatcher: Cleaning up daemon listener',
          );
          this.unregisterCallback();
          this.unregisterCallback = null;
        } else {
          this.logger.debug?.(
            'PassiveDaemonWatcher: No daemon listener to clean up',
          );
        }
      },
      logTransition: (_, params: { to: string }) => {
        this.logger.debug?.(
          `PassiveDaemonWatcher: Transitioning to ${params.to}`,
        );
      },
      notifyOperationalState: (_, params: { isOperational: boolean }) => {
        this.logger.debug?.(
          `PassiveDaemonWatcher: Operational state changed to ${params.isOperational}`,
        );
        if (this.onOperationalStateChange) {
          this.onOperationalStateChange(params.isOperational);
        }
      },
      logError: ({ event }) => {
        if (event.type === 'LISTENER_ERROR') {
          this.logger.log(
            `PassiveDaemonWatcher: Listener error - ${event.error}`,
          );
        }
      },
    },
    actors: {
      registerListener: fromPromise(async () => {
        this.logger.debug?.(
          'PassiveDaemonWatcher: registerListener actor started',
        );
        this.logger.debug?.(
          'PassiveDaemonWatcher: Attempting to get daemon client...',
        );
        const daemonClientModule = await getNxDaemonClient(
          this.workspacePath,
          this.logger,
        );
        this.logger.debug?.(
          `PassiveDaemonWatcher: Got daemon client module: ${!!daemonClientModule}`,
        );

        if (!daemonClientModule) {
          this.logger.debug?.(
            'PassiveDaemonWatcher: Daemon client module not available',
          );
          throw new Error(
            'Nx Daemon client is not available. Make sure you are using a compatible version of Nx.',
          );
        }

        const isEnabled = daemonClientModule.daemonClient?.enabled();
        this.logger.debug?.(
          `PassiveDaemonWatcher: Daemon client enabled check: ${isEnabled}`,
        );
        if (!isEnabled) {
          this.logger.debug?.(
            'PassiveDaemonWatcher: Daemon client is disabled',
          );
          throw new Error('Nx Daemon client is not enabled.');
        }

        this.logger.debug?.('PassiveDaemonWatcher: Daemon client is enabled');

        this.logger.debug?.(
          'PassiveDaemonWatcher: About to call registerProjectGraphRecomputationListener...',
        );
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
                this.listeners.forEach((listener) =>
                  listener(error, projectGraphAndSourceMaps),
                );
                return;
              }
              if (error === 'reconnected') {
                this.logger.debug?.(
                  'PassiveDaemonWatcher: Daemon connection reconnected',
                );
                this.listeners.forEach((listener) =>
                  listener(error, projectGraphAndSourceMaps),
                );
                return;
              }
              if (error) {
                this.logger.debug?.(
                  `PassiveDaemonWatcher: Listener error received: ${error}`,
                );
                this.actor.send({ type: 'LISTENER_ERROR', error });
              } else {
                this.logger.debug?.(
                  'PassiveDaemonWatcher: Project graph update received, notifying listeners',
                );
                this.listeners.forEach((listener) =>
                  listener(error, projectGraphAndSourceMaps),
                );
              }
            },
          );

        this.logger.debug?.(
          'PassiveDaemonWatcher: Successfully registered listener with daemon',
        );
        return unregister;
      }),
    },
  }).createMachine({
    id: 'passiveDaemonWatcher',
    initial: 'idle',
    states: {
      idle: {
        entry: [{ type: 'logTransition', params: { to: 'idle' } }],
        on: {
          START: 'starting',
        },
      },
      starting: {
        entry: [
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
            target: 'idle',
            actions: [
              {
                type: 'notifyOperationalState',
                params: { isOperational: false },
              },
            ],
          },
        },
      },
      listening: {
        entry: [
          { type: 'logTransition', params: { to: 'listening' } },
          { type: 'notifyOperationalState', params: { isOperational: true } },
        ],
        on: {
          LISTENER_ERROR: {
            target: 'idle',
            actions: [
              'logError',
              'cleanupListener',
              {
                type: 'notifyOperationalState',
                params: { isOperational: false },
              },
            ],
          },
          STOP: {
            target: 'idle',
            actions: [
              'cleanupListener',
              {
                type: 'notifyOperationalState',
                params: { isOperational: false },
              },
            ],
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
    this.logger.debug?.(
      `PassiveDaemonWatcher: Adding listener (total: ${this.listeners.size + 1})`,
    );
    this.listeners.set(id, callback);
    return () => {
      this.listeners.delete(id);
      this.logger.debug?.(
        `PassiveDaemonWatcher: Removed listener (total: ${this.listeners.size})`,
      );
    };
  }

  start() {
    this.logger.debug?.('PassiveDaemonWatcher: Starting watcher');
    this.actor.send({ type: 'START' });
  }

  stop() {
    this.logger.debug?.('PassiveDaemonWatcher: Stopping watcher');
    this.actor.send({ type: 'STOP' });
  }

  get state() {
    return this.actor.getSnapshot().value;
  }

  dispose() {
    this.logger.debug?.('PassiveDaemonWatcher: Disposing watcher');
    this.stop();
    this.listeners.clear();
    this.actor.stop();
  }
}
