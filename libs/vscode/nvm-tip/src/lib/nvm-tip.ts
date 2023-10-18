import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfigurationTarget, ExtensionContext, window } from 'vscode';

export async function initNvmTip(context: ExtensionContext) {
  const showTip = GlobalConfigurationStore.instance.get(
    'showNodeVersionOnStartup'
  );
  if (!showTip) {
    return;
  }
  const { stdout } = await promisify(exec)('node -v');
  const nodeVersion = stdout.trim();
  window
    .showInformationMessage(
      `VSCode loaded Node ${nodeVersion}. [That's wrong?](https://google.com)`,
      'OK',
      "Don't show again"
    )
    .then((value) => {
      if (value != 'OK') {
        GlobalConfigurationStore.instance.set(
          'showNodeVersionOnStartup',
          false,
          ConfigurationTarget.Global
        );
      }
    });
}
