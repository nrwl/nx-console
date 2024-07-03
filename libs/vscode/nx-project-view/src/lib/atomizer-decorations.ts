import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { getNxCloudStatus } from '@nx-console/vscode/nx-workspace';
import {
  commands,
  EventEmitter,
  ExtensionContext,
  FileDecoration,
  FileDecorationProvider,
  ProviderResult,
  ThemeColor,
  Uri,
  window,
} from 'vscode';
import {
  TargetGroupViewItem,
  TargetViewItem,
} from './views/nx-project-base-view';
import { NxTreeItem } from './nx-tree-item';

export const ATOMIZED_SCHEME = 'nx-project-view-atomized';

export class AtomizerDecorationProvider implements FileDecorationProvider {
  private changeEmitter = new EventEmitter<undefined>();
  onDidChangeFileDecorations = this.changeEmitter.event;

  private connectedToCloud = true;

  constructor() {
    this.subscribeToCloudStatus();
  }

  provideFileDecoration(uri: Uri): ProviderResult<FileDecoration> {
    if (uri.scheme === ATOMIZED_SCHEME) {
      return {
        badge: 'A',
        tooltip: 'Atomizer',
        propagate: false,
        color: this.connectedToCloud
          ? undefined
          : new ThemeColor('notificationsWarningIcon.foreground'),
      };
    }
  }

  async subscribeToCloudStatus() {
    const updateConnectedToCloud = async () => {
      const connectedToCloud = (await getNxCloudStatus())?.isConnected;
      if (
        connectedToCloud !== undefined &&
        this.connectedToCloud !== connectedToCloud
      ) {
        this.connectedToCloud = connectedToCloud;
        this.changeEmitter.fire(undefined);
      }
    };

    await updateConnectedToCloud();
    onWorkspaceRefreshed(() => updateConnectedToCloud());
  }

  static register(context: ExtensionContext) {
    context.subscriptions.push(
      window.registerFileDecorationProvider(new AtomizerDecorationProvider()),
      commands.registerCommand(
        'nxConsole.showAtomizerInfo',
        async (item: NxTreeItem) => {
          const isConnectedToCloud = (await getNxCloudStatus())?.isConnected;
          const nonAtomizedTarget = (item.item as TargetViewItem)
            .nonAtomizedTarget;
          if (isConnectedToCloud) {
            window
              .showInformationMessage(
                `Nx automatically split the potentially slow ${nonAtomizedTarget} task into separate tasks for each file. `,
                {
                  modal: true,
                  detail: `Enable Nx Agents to benefit from task distribution and flaky task re-runs. Use ${nonAtomizedTarget} when running without Nx Agents`,
                },
                'Learn More'
              )
              .then((selection) => {
                if (selection === 'Learn More') {
                  commands.executeCommand(
                    'vscode.open',
                    'https://nx.dev/ci/features/split-e2e-tasks#automatically-split-e2e-tasks-by-file-atomizer?utm_source=nxconsole'
                  );
                }
              });
          } else {
            window
              .showInformationMessage(
                `Nx automatically split the potentially slow ${nonAtomizedTarget} task into separate tasks for each file. `,
                {
                  modal: true,
                  detail: `Connect to Nx Cloud to benefit from task distribution, remote caching and flaky task re-runs. Use ${nonAtomizedTarget} when running without Nx Agents`,
                },
                'Connect to Nx Cloud',
                'Learn More'
              )
              .then((selection) => {
                if (selection === 'Connect to Nx Cloud') {
                  commands.executeCommand('nx.connectToCloud');
                }
                if (selection === 'Learn More') {
                  commands.executeCommand(
                    'vscode.open',
                    'https://nx.dev/ci/features/split-e2e-tasks#automatically-split-e2e-tasks-by-file-atomizer?utm_source=nxconsole'
                  );
                }
              });
          }
        }
      )
    );
  }
}
