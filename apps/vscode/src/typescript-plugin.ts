import { findConfig, readAndCacheJsonFile } from '@nx-console/server';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { dirname, join } from 'path';
import * as vscode from 'vscode';

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

  vscode.workspace.onDidOpenTextDocument(
    (document) => {
      if (document.uri.fsPath.endsWith('.ts')) {
        configurePlugin(api);
      }
    },
    undefined,
    context.subscriptions
  );

  configurePlugin(api);
}

async function configurePlugin(api: any) {
  const externalFiles = await getExternalFiles();
  // TODO(cammisuli): add config to disable this
  api.configurePlugin('@monodon/typescript-nx-imports-plugin', {
    externalFiles,
  });
}

async function getExternalFiles(): Promise<
  { mainFile: string; directory: string }[]
> {
  const workspaceRoot = dirname(
    WorkspaceConfigurationStore.instance.get('nxWorkspaceJsonPath', '')
  );

  const baseTsConfig = (
    await readAndCacheJsonFile('tsconfig.base.json', workspaceRoot)
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
