import { findConfig } from '@nx-console/shared/utils';
import {
  GlobalConfigurationStore,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode/configuration';
import { dirname, join, relative } from 'path';
import * as vscode from 'vscode';
import {
  clearJsonCache,
  listFiles,
  readAndCacheJsonFile,
} from '@nx-console/shared/file-system';
import { watchFile } from '@nx-console/vscode/utils';
import { getExternalFiles, TSCONFIG_BASE } from './get-external-files';

export async function enableTypeScriptPlugin(context: vscode.ExtensionContext) {
  const tsExtension = vscode.extensions.getExtension(
    'vscode.typescript-language-features'
  );
  if (!tsExtension) {
    return;
  }

  await tsExtension.activate();

  // Get the API from the TS extension
  if (!tsExtension.exports || !tsExtension.exports.getAPI) {
    return;
  }

  const api = tsExtension.exports.getAPI(0);
  if (!api) {
    return;
  }

  const workspaceRoot = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );

  vscode.workspace.onDidOpenTextDocument(
    (document) => {
      if (
        document.uri.fsPath.endsWith('.ts') ||
        document.uri.fsPath.endsWith('.tsx')
      ) {
        configurePlugin(workspaceRoot, api);
      }
    },
    undefined,
    context.subscriptions
  );

  watchFile(
    `${workspaceRoot}/tsconfig.base.json`,
    () => {
      clearJsonCache(TSCONFIG_BASE, workspaceRoot);
      configurePlugin(workspaceRoot, api);
    },
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    ({ document }) => {
      if (document.uri.fsPath.endsWith(TSCONFIG_BASE)) {
        configurePlugin(workspaceRoot, api);
      }
    },
    undefined,
    context.subscriptions
  );

  vscode.workspace.onDidChangeConfiguration(
    async (configurationChange) => {
      const affectsNxConsole = configurationChange.affectsConfiguration(
        GlobalConfigurationStore.configurationSection
      );

      const enableLibraryImports = GlobalConfigurationStore.instance.get(
        'enableLibraryImports'
      );

      if (!enableLibraryImports) {
        vscode.window.setStatusBarMessage(
          'Restarting the TypeScript Server',
          5000
        );
        await vscode.commands.executeCommand('typescript.restartTsServer');
      }

      if (affectsNxConsole) {
        configurePlugin(workspaceRoot, api);
      }
    },
    undefined,
    context.subscriptions
  );

  configurePlugin(workspaceRoot, api);
}

async function configurePlugin(workspaceRoot: string, api: any) {
  const enableLibraryImports = GlobalConfigurationStore.instance.get(
    'enableLibraryImports'
  );

  if (enableLibraryImports) {
    const externalFiles = await getExternalFiles(workspaceRoot);
    api.configurePlugin('@monodon/typescript-nx-imports-plugin', {
      externalFiles,
    });
  }
}
