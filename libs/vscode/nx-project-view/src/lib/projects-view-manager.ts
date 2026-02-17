import { NxWorkspace } from '@nx-console/shared-types';
import {
  getNxlsState,
  onNxlsStateChange,
  onWorkspaceRefreshed,
} from '@nx-console/vscode-lsp-client';
import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { commands, Disposable, ExtensionContext } from 'vscode';
import { createActor, fromPromise, waitFor } from 'xstate';
import { NxProjectTreeProvider } from './nx-project-tree-provider';
import {
  projectsViewMachine,
  ProjectsViewState,
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
            async (): Promise<NxWorkspace | undefined> => {
              return await getNxWorkspace();
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
          },
          refreshTreeView: () => {
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
