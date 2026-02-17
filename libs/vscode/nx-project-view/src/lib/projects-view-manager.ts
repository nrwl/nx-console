import {
  getNxlsState,
  onNxlsStateChange,
  onWorkspaceRefreshed,
} from '@nx-console/vscode-lsp-client';
import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { existsSync } from 'fs';
import { join } from 'path';
import { commands, Disposable, ExtensionContext } from 'vscode';
import { createActor, fromPromise } from 'xstate';
import { NxProjectTreeProvider } from './nx-project-tree-provider';
import {
  projectsViewMachine,
  ProjectsViewState,
  WorkspaceLoadResult,
} from './projects-view-state-machine';

export class ProjectsViewManager implements Disposable {
  private actor;
  private disposables: Disposable[] = [];

  constructor(
    context: ExtensionContext,
    private treeProvider: NxProjectTreeProvider,
  ) {
    this.actor = createActor(
      projectsViewMachine.provide({
        actors: {
          waitForNxls: fromPromise(async () => {
            return this.waitForNxlsRunning();
          }),
          loadWorkspaceData: fromPromise(
            async (): Promise<WorkspaceLoadResult> => {
              const workspace = await getNxWorkspace();
              const workspacePath = getNxWorkspacePath();
              const hasDependencies =
                existsSync(join(workspacePath, 'node_modules', 'nx')) ||
                existsSync(
                  join(
                    workspacePath,
                    '.nx',
                    'installation',
                    'node_modules',
                    'nx',
                  ),
                ) ||
                existsSync(join(workspacePath, '.pnp.cjs')) ||
                existsSync(join(workspacePath, '.pnp.js'));
              return { workspace, hasDependencies };
            },
          ),
        },
        actions: {
          setViewContext: (_, params: { state: ProjectsViewState }) => {
            vscodeLogger.log(`[debug-view] setViewContext: ${params.state}`);
            commands.executeCommand(
              'setContext',
              'nxProjectsView.state',
              params.state,
            );
            if (params.state !== 'ready') {
              this.treeProvider.setEnabled(false);
              this.treeProvider.refresh();
            }
          },
          refreshTreeView: () => {
            this.treeProvider.setEnabled(true);
            this.treeProvider.refresh();
          },
        },
      }),
    );

    this.actor.start();

    this.disposables.push(
      onWorkspaceRefreshed(() => {
        this.actor.send({ type: 'REFRESH' });
      }),
    );
  }

  private async waitForNxlsRunning(): Promise<void> {
    const currentState = getNxlsState();

    if (currentState === 'running') {
      return;
    }

    if (currentState === 'idle') {
      throw new Error('Nxls is idle - workspace may not be configured');
    }

    return new Promise<void>((resolve, reject) => {
      const disposable = onNxlsStateChange((state, error) => {
        if (state === 'running') {
          disposable.dispose();
          resolve();
        } else if (state === 'idle' && error) {
          disposable.dispose();
          reject(new Error(error));
        }
      });

      this.disposables.push(disposable);
    });
  }

  public refresh(): void {
    this.actor.send({ type: 'REFRESH' });
  }

  public dispose(): void {
    this.actor.stop();
    this.disposables.forEach((d) => d.dispose());
  }
}
