import { clearJsonCache } from '@nx-console/shared/file-system';
import {
  GlobalConfigurationStore,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode/configuration';
import { watchFile } from '@nx-console/vscode/utils';
import * as vscode from 'vscode';
import { getExternalFiles, TSCONFIG_BASE } from './get-external-files';
import { getNxVersion } from '@nx-console/vscode/nx-workspace';
import { gte } from 'semver';
import {
  findNxPackagePath,
  importWorkspaceDependency,
  workspaceDependencyPath,
} from '@nx-console/shared/npm';
import { join } from 'path';
import { createMachine } from 'xstate';

let enabled = false;

let disposables: vscode.Disposable[] = [];

export async function initTypeScriptServerPlugin(
  context: vscode.ExtensionContext
) {
  const workspaceRoot = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );

  const enableLibraryImports = GlobalConfigurationStore.instance.get(
    'enableLibraryImports'
  );

  const usingTsSolutionSetup = await isUsingTsSolutionSetup(workspaceRoot);

  if (enableLibraryImports && !usingTsSolutionSetup) {
    enableTypescriptServerPlugin(context, workspaceRoot);
  }

  vscode.workspace.onDidChangeConfiguration(
    async (configurationChange) => {
      configurationChange;
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
}

async function enableTypescriptServerPlugin(
  context: vscode.ExtensionContext,
  workspaceRoot: string
) {
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

  enabled = true;

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

async function isUsingTsSolutionSetup(workspaceRoot: string): Promise<boolean> {
  const nxVersion = await getNxVersion();
  if (nxVersion && gte(nxVersion.full, '20.0.0')) {
    const tsSolutionSetupPath = await workspaceDependencyPath(
      workspaceRoot,
      join('@nx', 'js', 'src', 'utils', 'typescript', 'ts-solution-setup.js')
    );
    if (!tsSolutionSetupPath) {
      return false;
    }
    const { isUsingTsSolutionSetup } = await importWorkspaceDependency<any>( // typeof import('@nx/js/src/utils/typescript/')
      tsSolutionSetupPath
    );
    return isUsingTsSolutionSetup();
  }
  return false;
}
