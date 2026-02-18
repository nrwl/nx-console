import { GlobalConfigurationStore } from '@nx-console/vscode-configuration';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  ConfigurationTarget,
  ExtensionContext,
  commands,
  window,
} from 'vscode';

export async function initNvmTip(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('nxConsole.showNodeVersion', async () => {
      const nodeVersion = await getNodeVersion();
      window.showInformationMessage(
        `VSCode loaded Node ${nodeVersion}. [If that seems wrong, read more here.](https://nx.dev/recipes/nx-console/console-troubleshooting#vscode-nvm-issues)`,
      );
    }),
  );

  const showTip = GlobalConfigurationStore.instance.get(
    'showNodeVersionOnStartup',
  );
  if (!showTip) {
    return;
  }
  const nodeVersion = await getNodeVersion();
  window
    .showInformationMessage(
      `VSCode loaded Node ${nodeVersion}. [If that seems wrong, read more here.](https://nx.dev/recipes/nx-console/console-troubleshooting#vscode-nvm-issues)`,
      'OK',
      "Don't show again",
    )
    .then((value) => {
      if (value !== 'OK' && value !== undefined) {
        GlobalConfigurationStore.instance.set(
          'showNodeVersionOnStartup',
          false,
          ConfigurationTarget.Global,
        );
      }
    });
}

async function getNodeVersion(): Promise<string> {
  const { stdout } = await promisify(exec)('node -v');
  return stdout.trim();
}
