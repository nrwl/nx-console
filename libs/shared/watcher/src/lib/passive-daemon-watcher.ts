import { getNxDaemonClient } from '@nx-console/shared-nx-workspace-info';
import { Logger } from '@nx-console/shared-utils';
import { randomUUID } from 'crypto';
import type { ProjectGraph } from 'nx/src/config/project-graph';
import type { ConfigurationSourceMaps } from 'nx/src/project-graph/utils/project-configuration-utils';

// uses the daemon client to subscribe to project graph change events
// doesn't fallback to native watcher and doesn't work on older versions of nx
// that's an acceptable limitation for keeping this as lean as possible
export class PassiveDaemonWatcher {
  private listeners: Map<
    string,
    (error: Error | null | 'closed', projectGraph: ProjectGraph | null) => void
  > = new Map();

  private unregisterCallback?: () => void;

  constructor(
    private workspacePath: string,
    private logger: Logger,
  ) {}

  listen(
    callback: (
      error: Error | null | 'closed',
      projectGraph: ProjectGraph | null,
    ) => void,
  ): () => void {
    const id = randomUUID();
    this.listeners.set(id, callback);
    return () => {
      this.listeners.delete(id);
    };
  }

  async start() {
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

    this.unregisterCallback =
      await daemonClientModule.daemonClient.registerProjectGraphRecomputationListener(
        (
          error: Error | null | 'closed',
          projectGraphAndSourceMaps: {
            projectGraph: ProjectGraph;
            sourceMaps: ConfigurationSourceMaps;
          } | null,
        ) => {
          this.listeners.forEach((listener) =>
            listener(error, projectGraphAndSourceMaps?.projectGraph ?? null),
          );
        },
      );
  }

  dispose() {
    this.listeners.clear();
    this.unregisterCallback?.();
  }
}
