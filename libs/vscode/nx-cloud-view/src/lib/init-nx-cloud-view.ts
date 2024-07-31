import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { getNxCloudStatus } from '@nx-console/vscode/nx-workspace';
import { getNxlsOutputChannel } from '@nx-console/vscode/output-channels';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import {
  getTelemetry,
  TelemetryEventSource,
} from '@nx-console/vscode/telemetry';
import {
  commands,
  ExtensionContext,
  ShellExecution,
  Task,
  tasks,
  TaskScope,
  window,
} from 'vscode';
import { CloudOnboardingViewProvider } from './cloud-onboarding-view';
import { getNxCloudId, importNxPackagePath } from '@nx-console/shared/npm';
import { getNxWorkspacePath } from '@nx-console/vscode/configuration';
import { getWorkspacePath } from '@nx-console/vscode/utils';

export function initNxCloudView(context: ExtensionContext) {
  const provider = new CloudOnboardingViewProvider(context);
  context.subscriptions.push(
    window.registerWebviewViewProvider(
      CloudOnboardingViewProvider.viewId,
      provider
    )
  );

  context.subscriptions.push(
    commands.registerCommand('nx.connectToCloud', async () => {
      runNxConnect('command');
    }),
    commands.registerCommand(
      'nxConsole.connectToCloud.welcomeView',
      async () => {
        runNxConnect('welcome-view');
      }
    ),
    commands.registerCommand('nxConsole.openCloudApp', async () => {
      const cloudUrl = (await getNxCloudStatus())?.nxCloudUrl;
      const cloudId = await getNxCloudId(getNxWorkspacePath());

      if (cloudUrl) {
        getTelemetry().logUsage('cloud.open-app');
        const cloudUrlWithTracking = `${cloudUrl}?utm_campaign=open-cloud-app&utm_medium=cloud-promo&utm_source=nxconsole`;
        commands.executeCommand('vscode.open', cloudUrlWithTracking);
      } else {
        window
          .showErrorMessage(
            'Something went wrong while retrieving the Nx Cloud URL.',
            'Open Logs',
            'OK'
          )
          .then((selection) => {
            if (selection === 'Open Logs') {
              getNxlsOutputChannel().show();
            }
          });
      }
    }),
    commands.registerCommand('nxCloud.login', async () => {
      const workspacePath = getWorkspacePath();
      const { getPackageManagerCommand } = await importNxPackagePath<
        typeof import('nx/src/devkit-exports')
      >(workspacePath, 'src/devkit-exports');
      const pkgManagerCommands = getPackageManagerCommand();

      // getTelemetry().featureUsed('nxCloud.login');

      const command = 'nx-cloud login';
      const task = new Task(
        { type: 'nx' },
        TaskScope.Workspace,
        command,
        'nx',
        new ShellExecution(`${pkgManagerCommands.dlx} ${command}`, {
          cwd: workspacePath,
          env: {
            ...process.env,
            NX_CONSOLE: 'true',
          },
        })
      );
      task.presentationOptions.focus = true;

      tasks.executeTask(task);
    }),
    commands.registerCommand('nxCloud.refresh', () => {
      provider.refresh();
    })
  );

  /// old stuff
  const setContext = async () => {
    const nxCloudStatus = await getNxCloudStatus();
    commands.executeCommand(
      'setContext',
      'nxConsole.connectedToCloud',
      nxCloudStatus?.isConnected ?? false
    );
  };
  setContext();
  onWorkspaceRefreshed(() => setContext());
}

export function runNxConnect(source: TelemetryEventSource = 'command') {
  getTelemetry().logUsage('cloud.connect', {
    source,
  });
  CliTaskProvider.instance.executeTask({
    command: 'connect',
    flags: [],
  });
}
