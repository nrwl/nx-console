import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import {
  ConfigurationChangeEvent,
  Disposable,
  ExtensionContext,
  languages,
  workspace,
} from 'vscode';
import { WorkspaceCodeLensProvider } from './workspace-codelens-provider';

let codeLensProvider: Disposable | null;

export function initNxConfigDecoration(context: ExtensionContext) {
  registerWorkspaceCodeLensProvider(context);
  watchWorkspaceCodeLensConfigChange(context);
}

/**
 * Checks the enableWorkspaceConfigCodeLens setting and registers this as a CodeLensProvider.
 * @param context instance of ExtensionContext from activate
 */
function registerWorkspaceCodeLensProvider(context: ExtensionContext) {
  const enableWorkspaceConfigCodeLens = GlobalConfigurationStore.instance.get(
    'enableWorkspaceConfigCodeLens'
  );
  if (enableWorkspaceConfigCodeLens) {
    codeLensProvider = languages.registerCodeLensProvider(
      { pattern: '**/{workspace,project}.json' },
      new WorkspaceCodeLensProvider()
    );
    context.subscriptions.push(codeLensProvider);
  }
}

/**
 * Watches for settings/configuration changes and enables/disables the CodeLensProvider
 * @param context instance of ExtensionContext from activate
 */
function watchWorkspaceCodeLensConfigChange(context: ExtensionContext) {
  context.subscriptions.push(
    workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
      // if the `nxConsole` config changes, check enableWorkspaceConfigCodeLens and register or dispose
      const affectsNxConsoleConfig = event.affectsConfiguration(
        GlobalConfigurationStore.configurationSection
      );
      if (affectsNxConsoleConfig) {
        const enableWorkspaceConfigCodeLens =
          GlobalConfigurationStore.instance.get(
            'enableWorkspaceConfigCodeLens'
          );
        if (enableWorkspaceConfigCodeLens && !codeLensProvider) {
          registerWorkspaceCodeLensProvider(context);
        } else if (!enableWorkspaceConfigCodeLens && codeLensProvider) {
          codeLensProvider.dispose();
          codeLensProvider = null;
        }
      }
    })
  );
}
