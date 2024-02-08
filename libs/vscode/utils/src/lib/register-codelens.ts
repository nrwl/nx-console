import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import {
  CodeLensProvider,
  ConfigurationChangeEvent,
  DocumentSelector,
  ExtensionContext,
  languages,
  workspace,
} from 'vscode';
import { Disposable } from 'vscode-languageserver';

export interface NxCodeLensProvider extends CodeLensProvider {
  CODELENS_PATTERN: DocumentSelector;
}
const registeredCodeLensProviders = new Set<NxCodeLensProvider>();
const codeLensDisposables = new Set<Disposable>();

export function registerCodeLensProvider(provider: NxCodeLensProvider): void {
  registeredCodeLensProviders.add(provider);
  if (GlobalConfigurationStore.instance.get('enableCodeLens')) {
    codeLensDisposables.add(
      languages.registerCodeLensProvider(provider.CODELENS_PATTERN, provider)
    );
  }
}

function disposeCodeLensProviders() {
  codeLensDisposables.forEach((provider) => provider.dispose());
  codeLensDisposables.clear();
}

function restartCodelensProviders() {
  registeredCodeLensProviders.forEach((provider) => {
    codeLensDisposables.add(
      languages.registerCodeLensProvider(provider.CODELENS_PATTERN, provider)
    );
  });
}

/**
 * Watches for settings/configuration changes and enables/disables the CodeLensProviders
 * @param context instance of ExtensionContext from activate
 */
export function watchCodeLensConfigChange(context: ExtensionContext) {
  context.subscriptions.push(
    workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
      // if the `nxConsole` config changes, check enableWorkspaceConfigCodeLens and register or dispose
      const affectsNxConsoleConfig = event.affectsConfiguration(
        GlobalConfigurationStore.configurationSection
      );
      if (affectsNxConsoleConfig) {
        const enableWorkspaceConfigCodeLens =
          GlobalConfigurationStore.instance.get('enableCodeLens');
        if (enableWorkspaceConfigCodeLens) {
          restartCodelensProviders();
        } else if (!enableWorkspaceConfigCodeLens) {
          disposeCodeLensProviders();
        }
      }
    })
  );
}
