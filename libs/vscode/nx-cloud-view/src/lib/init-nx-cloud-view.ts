import { CliTaskProvider } from '@nx-console/vscode/tasks';
import {
  getTelemetry,
  TelemetryEventSource,
} from '@nx-console/vscode/telemetry';
import { commands, ExtensionContext, window } from 'vscode';
import { CloudOnboardingViewProvider } from './cloud-onboarding-view';

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
    // commands.registerCommand('nxCloud.login', async () => {
    //   const workspacePath = getWorkspacePath();
    //   const { getPackageManagerCommand } = await importNxPackagePath<
    //     typeof import('nx/src/devkit-exports')
    //   >(workspacePath, 'src/devkit-exports');
    //   const pkgManagerCommands = getPackageManagerCommand();

    //   const command = 'nx-cloud login';
    //   const task = new Task(
    //     { type: 'nx' },
    //     TaskScope.Workspace,
    //     command,
    //     'nx',
    //     new ShellExecution(`${pkgManagerCommands.dlx} ${command}`, {
    //       cwd: workspacePath,
    //       env: {
    //         ...process.env,
    //         NX_CONSOLE: 'true',
    //       },
    //     })
    //   );
    //   task.presentationOptions.focus = true;

    //   tasks.executeTask(task);
    // }),
    commands.registerCommand('nxCloud.refresh', () => {
      provider.refresh();
    })
  );
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
