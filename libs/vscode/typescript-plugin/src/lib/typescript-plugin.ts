import { gte } from '@nx-console/nx-version';
import { clearJsonCache } from '@nx-console/shared-file-system';
import {
  importWorkspaceDependency,
  workspaceDependencyPath,
} from '@nx-console/shared-npm';
import {
  GlobalConfigurationStore,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode-configuration';
import { onWorkspaceRefreshed } from '@nx-console/vscode-lsp-client';
import { getNxVersion, getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { watchFile } from '@nx-console/vscode-utils';
import type { ProjectGraph } from 'nx/src/devkit-exports';
import { join } from 'path';
import * as vscode from 'vscode';
import { Actor, createActor, fromPromise, setup } from 'xstate';
import {
  getPluginConfiguration,
  PluginConfigurationCache,
  TSCONFIG_BASE,
} from './plugin-configuration';

let disposables: vscode.Disposable[] = [];

export async function initTypeScriptServerPlugin(
  vscodeContext: vscode.ExtensionContext,
) {
  const machine = createActor(
    setup({
      actions: {
        disableServerPlugin: () => disableTypescriptServerPlugin(),
        assignWorkspaceRoot: ({ context, event }) => {
          context.workspaceRoot = event.workspaceRoot;
        },
      },
      actors: {
        enableServerPlugin: fromPromise(
          async ({ input }: { input: { workspaceRoot: string } }) => {
            return await enableTypescriptServerPlugin(
              vscodeContext,
              input.workspaceRoot,
            );
          },
        ),
      },
      types: {
        context: {} as {
          workspaceRoot: string;
        },
      },
      guards: {
        tsExtensionExists: () => {
          try {
            const tsExtension = vscode.extensions.getExtension(
              'vscode.typescript-language-features',
            );
            return !!tsExtension;
          } catch (e) {
            return false;
          }
        },
      },
    }).createMachine({
      /** @xstate-layout N4IgpgJg5mDOIC5QBcCeAHOBjATgS3WQFpYwcA3Mo9AGwFco8A7IgWwEMsALZsAOgh5Y7AEY1IAYgCiAOQCCAIQAyUgNoAGALqJQ6APaw8yPHqY6QAD0QAmAOwAOPgBZ7TgMz2HT2wFY31+wAaEFQbdWs+Nydo9QBGewA2dXVEhISAX3TgtExYXAJiUgoqWgZmNk4eJn5BYTFJAGUpABUAfQB1AHkAJQBpBoAFOQBhKVbuzs7mjW0kEH1DY1NzKwQna2DQhABOJz5YnySndW31Nzc4t23M7IxsfEISMkocanpGFg5uXj4wJlFxBAJE02l0+oMRmMJlMZuYFkYTGY5qsfO4+NsErtktsLrFbLYnJtEPZYpFrNZTtt7MlYnZYhksiAcvcCk9iq9Sh8Kt9qr9-vUgQARACSDUUKlhc3hSyRoFWUQi6gcsXUPgCnmiPiJCBVtj46kxCR89h8B1cpusmUZTD0EDg5mZeQehWeJXe5S+VTAcIMCOWyMQRAS2qDNyZdydrKKLzeZU+lR+tQBkB9i0RK0QKoiAX8BoNauS9m22tiu2cFy81m8qIpbjDjvyj2jbrj3K9fOTEFTftllkQfgSfES-nsbli7k8xpLJL4Pm2tiNY+ibgSnit6SAA */
      id: 'typescript-server-plugin-machine',
      context: {
        workspaceRoot: WorkspaceConfigurationStore.instance.get(
          'nxWorkspacePath',
          '',
        ),
      },
      initial: 'disabled',
      states: {
        disabled: {
          on: {
            ENABLE: {
              guard: 'tsExtensionExists',
              target: 'enabled',
            },
            SET_WORKSPACE_ROOT: {
              actions: 'assignWorkspaceRoot',
            },
          },
        },
        enabled: {
          invoke: {
            src: 'enableServerPlugin',
            input: ({ context }) => ({ workspaceRoot: context.workspaceRoot }),
          },
          on: {
            SET_WORKSPACE_ROOT: {
              actions: ['assignWorkspaceRoot'],
              target: 'enabled',
            },
            DISABLE: {
              target: 'disabled',
              actions: 'disableServerPlugin',
            },
          },
        },
      },
    }),
  ).start();

  handleServerPluginEnablement(machine);

  vscode.workspace.onDidChangeConfiguration(
    async (configurationChange) => {
      configurationChange;
      const affectsNxConsole = configurationChange.affectsConfiguration(
        GlobalConfigurationStore.configurationSection,
      );

      if (!affectsNxConsole) {
        return;
      }

      handleServerPluginEnablement(machine);
    },
    undefined,
    vscodeContext.subscriptions,
  );

  const disposable = onWorkspaceRefreshed(async () => {
    await handleServerPluginEnablement(machine);
  });
  if (disposable) {
    vscodeContext.subscriptions.push(disposable);
  }
}

async function handleServerPluginEnablement(machine: Actor<any>) {
  const enableLibraryImports = GlobalConfigurationStore.instance.get(
    'enableLibraryImports',
  );

  if (enableLibraryImports) {
    machine.send({ type: 'ENABLE' });
  } else {
    machine.send({ type: 'DISABLE' });
  }
}

async function enableTypescriptServerPlugin(
  context: vscode.ExtensionContext,
  workspaceRoot: string,
) {
  getOutputChannel().appendLine(
    `Enabling TypeScript plugin for workspace ${workspaceRoot}`,
  );
  const tsExtension = vscode.extensions.getExtension(
    'vscode.typescript-language-features',
  );
  if (!tsExtension) {
    return;
  }

  if (!tsExtension.isActive) {
    await tsExtension.activate();
  }

  // Get the API from the TS extension
  if (!tsExtension.exports || !tsExtension.exports.getAPI) {
    return;
  }

  const api = tsExtension.exports.getAPI(0);
  if (!api) {
    return;
  }

  const pluginConfigurationCache = new PluginConfigurationCache();

  const isTsSolutionSetup = await isUsingTsSolutionSetup(workspaceRoot);
  let projectGraph: ProjectGraph | undefined;
  if (isTsSolutionSetup) {
    ({ projectGraph } = await getNxWorkspace());

    disposables.push(
      onWorkspaceRefreshed(async () => {
        ({ projectGraph } = await getNxWorkspace());
        await configurePlugin(
          workspaceRoot,
          projectGraph,
          api,
          pluginConfigurationCache,
        );
      }),
    );
  }

  disposables.push(
    vscode.workspace.onDidOpenTextDocument(
      (document) => {
        if (
          document.uri.fsPath.endsWith('.ts') ||
          document.uri.fsPath.endsWith('.tsx')
        ) {
          configurePlugin(
            workspaceRoot,
            projectGraph,
            api,
            pluginConfigurationCache,
          );
        }
      },
      undefined,
      context.subscriptions,
    ),
    watchFile(
      `${workspaceRoot}/tsconfig.base.json`,
      () => {
        clearJsonCache(TSCONFIG_BASE, workspaceRoot);
        configurePlugin(
          workspaceRoot,
          projectGraph,
          api,
          pluginConfigurationCache,
        );
      },
      context.subscriptions,
    ),
    vscode.workspace.onDidChangeTextDocument(
      ({ document }) => {
        if (document.uri.fsPath.endsWith(TSCONFIG_BASE)) {
          configurePlugin(
            workspaceRoot,
            projectGraph,
            api,
            pluginConfigurationCache,
          );
        }
      },
      undefined,
      context.subscriptions,
    ),
  );

  await configurePlugin(
    workspaceRoot,
    projectGraph,
    api,
    pluginConfigurationCache,
  );
}

async function disableTypescriptServerPlugin() {
  getOutputChannel().appendLine(`Disabling TypeScript plugin`);
  disposables.forEach((d) => d.dispose());
  disposables = [];
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: 'Restarting the TypeScript Server',
    },
    async () => {
      await vscode.commands.executeCommand('typescript.restartTsServer');
    },
  );
}

async function configurePlugin(
  workspaceRoot: string,
  projectGraph: ProjectGraph | undefined,
  api: any,
  pluginConfigurationCache: PluginConfigurationCache,
) {
  const configuration = await getPluginConfiguration(
    workspaceRoot,
    projectGraph,
  );

  if (pluginConfigurationCache.matchesCachedResult(configuration)) {
    // if the result is cached, we don't need to configure the plugin again
    return;
  }

  pluginConfigurationCache.store(configuration);

  api.configurePlugin(
    '@nx-console/vscode-typescript-import-plugin',
    configuration,
  );
}

async function isUsingTsSolutionSetup(workspaceRoot: string): Promise<boolean> {
  const nxVersion = await getNxVersion();
  if (nxVersion && gte(nxVersion.full, '20.1.0')) {
    try {
      const nxJsPath = await workspaceDependencyPath(
        workspaceRoot,
        join('@nx', 'js'),
      );
      if (!nxJsPath) {
        return false;
      }
      const tsSolutionSetupPath = join(
        nxJsPath,
        'src',
        'utils',
        'typescript',
        'ts-solution-setup.js',
      );

      const { isUsingTsSolutionSetup } =
        await importWorkspaceDependency<
          typeof import('@nx/js/src/utils/typescript/ts-solution-setup')
        >(tsSolutionSetupPath);
      return isUsingTsSolutionSetup();
    } catch (e) {
      return false;
    }
  }
  return false;
}
