import { getPackageManagerCommand } from '@nrwl/devkit';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import {
  AbstractTreeProvider,
  getTelemetry,
  getWorkspacePath,
  watchFile,
} from '@nx-console/vscode/utils';
import { exec, execSync, spawn } from 'child_process';
import { join } from 'path';
import { coerce, gt, gte, lt } from 'semver';
import { promisify } from 'util';
import {
  commands,
  Event,
  EventEmitter,
  ExtensionContext,
  ProgressLocation,
  ThemeColor,
  ThemeIcon,
  TreeItem,
  Uri,
  window,
} from 'vscode';
import { NxHelpAndFeedbackTreeItem } from './nx-help-and-feedback-tree-item';

export class NxHelpAndFeedbackProvider extends AbstractTreeProvider<
  NxHelpAndFeedbackTreeItem | TreeItem
> {
  nxJsonChange = new EventEmitter<undefined>();
  nxJsonHasChanged = false;

  constructor(private readonly context: ExtensionContext) {
    super();
    context.subscriptions.push(
      commands.registerCommand('nxConsole.connectToNxCloud', () => {
        this.connectToCloud();
      }),
      watchFile(`${getWorkspacePath()}/nx.json`, () => {
        this.nxJsonHasChanged = true;
        this.nxJsonChange.fire(undefined);
      })
    );
  }

  getParent(_: NxHelpAndFeedbackTreeItem | TreeItem) {
    return null;
  }

  async getChildren(): Promise<
    (NxHelpAndFeedbackTreeItem | TreeItem)[] | null | undefined
  > {
    return [await this.getConnectToNxCloudItem(), ...this.getInfoItems()];
  }

  onDidChangeTreeData: Event<NxHelpAndFeedbackTreeItem | TreeItem | undefined> =
    this.nxJsonChange.event;

  async getConnectToNxCloudItem(): Promise<TreeItem> {
    const isConnected = await this.isConnectedToCloud();
    const treeItem = new TreeItem(
      isConnected
        ? 'You are connected to Nx Cloud!'
        : 'Disconnected from Nx Cloud. Connect now?'
    );

    treeItem.iconPath = new ThemeIcon(
      isConnected ? 'cloud' : 'debug-disconnect',
      new ThemeColor(isConnected ? 'testing.iconPassed' : 'testing.iconFailed')
    );
    if (!isConnected) {
      treeItem.contextValue = 'connectToNxCloud';
    }
    return treeItem;
  }

  getInfoItems() {
    return (
      [
        [
          'Nx Console Documentation',
          'https://nx.dev/core-features/integrate-with-editors#nx-console-for-vscode',
          {
            light: Uri.file(
              join(this.context.extensionPath, 'assets', 'nx-console-light.svg')
            ),
            dark: Uri.file(
              join(this.context.extensionPath, 'assets', 'nx-console-dark.svg')
            ),
          },
        ],
        ['Nx Documentation', 'https://nx.dev/', new ThemeIcon('book')],
        [
          'Report a Bug',
          'https://github.com/nrwl/nx-console/issues/new?labels=type%3A+bug&template=1-bug.md',
          new ThemeIcon('bug'),
        ],
        [
          'Suggest a Feature',
          'https://github.com/nrwl/nx-console/issues/new?labels=type%3A+feature&template=2-feature.md',
          new ThemeIcon('lightbulb'),
        ],
      ] as const
    ).map(
      ([title, link, icon]) => new NxHelpAndFeedbackTreeItem(title, link, icon)
    );
  }

  async isConnectedToCloud(): Promise<boolean> {
    const nxConfig = (await getNxWorkspace(this.nxJsonHasChanged)).workspace;

    if (!nxConfig.tasksRunnerOptions) {
      return false;
    }
    return !!Object.values(nxConfig.tasksRunnerOptions).find(
      (r) => r.runner == '@nrwl/nx-cloud'
    );
  }

  async connectToCloud() {
    getTelemetry().featureUsed('nxConsole.connectToNxCloud');

    const isConnected = await this.isConnectedToCloud();
    if (isConnected) {
      window.showInformationMessage('You are already connected to Nx Cloud');
      return;
    }

    const nxVersion = await WorkspaceConfigurationStore.instance.get(
      'nxVersion',
      'latest'
    );

    window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: 'Connecting you to Nx Cloud...',
      },
      () => {
        return new Promise((resolve) => {
          try {
            if (lt(coerce(nxVersion) ?? '', '12.0.0')) {
              promisify(exec)(
                `${
                  getPackageManagerCommand().addDev
                } @nrwl/nx-cloud@${nxVersion}`,
                { cwd: getWorkspacePath() }
              )
                .then(() => {
                  promisify(exec)(
                    `${
                      getPackageManagerCommand().exec
                    } nx g @nrwl/nx-cloud:init`,
                    { cwd: getWorkspacePath() }
                  ).then(() => resolve(true));
                })
                .catch((e) => {
                  window.showErrorMessage(e.message);
                  resolve(true);
                });
              return;
            }

            process.exit = function (code?: number) {
              console.log(
                'process.exit called with code (before spawn)' + code
              );
            } as (code?: number) => never;

            const commandProcess = spawn(
              getPackageManagerCommand().exec,
              [
                'nx',
                // https://github.com/nrwl/nx/pull/12942
                gte(coerce(nxVersion) ?? '', '15.0.7')
                  ? 'connect'
                  : 'connect-to-nx-cloud',
              ],
              { cwd: getWorkspacePath(), shell: true }
            );

            commandProcess.stdout.setEncoding('utf8');

            commandProcess.stdout.on('data', (data) => {
              if (data.includes('I want faster builds')) {
                commandProcess.stdin.write('yes\r\n', 'utf8');
              }
            });

            commandProcess.on('close', () => resolve(true));
          } catch (e) {
            window.showErrorMessage(e.message);
            resolve(true);
          }
        });
      }
    );
  }
}
