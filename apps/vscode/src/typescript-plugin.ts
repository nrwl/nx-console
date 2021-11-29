import {
  clearJsonCache,
  findConfig,
  readAndCacheJsonFile,
  watchFile,
} from '@nx-console/server';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { dirname, join } from 'path';
import * as vscode from 'vscode';

const TSCONFIG_BASE = 'tsconfig.base.json';

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

  const workspaceRoot = dirname(
    WorkspaceConfigurationStore.instance.get('nxWorkspaceJsonPath', '')
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

  configurePlugin(workspaceRoot, api);
}

async function configurePlugin(workspaceRoot: string, api: any) {
  const externalFiles = await getExternalFiles(workspaceRoot);
  // TODO(cammisuli): add config to disable this
  api.configurePlugin('@monodon/typescript-nx-imports-plugin', {
    externalFiles,
  });
}

async function getExternalFiles(
  workspaceRoot: string
): Promise<{ mainFile: string; directory: string }[]> {
  const baseTsConfig = (
    await readAndCacheJsonFile(TSCONFIG_BASE, workspaceRoot)
  ).json;

  const paths = baseTsConfig.compilerOptions.paths;

  const externals: { mainFile: string; directory: string }[] = [];

  for (const [, value] of Object.entries<string[]>(paths)) {
    const mainFile = join(workspaceRoot, value[0]);
    const configFilePath = await findConfig(mainFile, 'tsconfig.lib.json');

    if (!configFilePath) {
      continue;
    }

    const directory = dirname(configFilePath);
    externals.push({ mainFile, directory });
  }

  return externals;
}
