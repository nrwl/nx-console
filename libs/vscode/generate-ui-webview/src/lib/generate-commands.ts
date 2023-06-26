import { GeneratorType } from '@nx-console/shared/schema';
import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import { getNxVersion, getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getTelemetry } from '@nx-console/vscode/utils';
import { ExtensionContext, Uri, commands, window } from 'vscode';
import {
  selectGeneratorAndPromptForFlags,
  selectReMoveGenerator,
} from '@nx-console/vscode/nx-cli-quickpicks';
import { openGenerateUi } from './init-generate-ui-webview';
import { RunTargetTreeItem } from '@nx-console/vscode/nx-run-target-view';

export async function registerGenerateCommands(context: ExtensionContext) {
  commands.registerCommand(`nx.generate`, async () => {
    getTelemetry().featureUsed('nx.generate');
    const result = await selectGeneratorAndPromptForFlags();
    if (!result) {
      return;
    }
    const { generator, flags } = result;
    if (flags !== undefined) {
      CliTaskProvider.instance.executeTask({
        positional: generator.positional,
        command: 'generate',
        flags,
      });
    }
  });

  commands.registerCommand(`nx.generate.ui`, () => {
    getTelemetry().featureUsed('nx.generate.ui');
    showGenerateUi(context.extensionPath);
  });

  commands.registerCommand(`nx.generate.ui.fileexplorer`, (uri: Uri) => {
    getTelemetry().featureUsed('nx.generate.fileexplorer');
    showGenerateUi(context.extensionPath, uri);
  });

  /**
   * move and remove were release in patch 8.11
   */
  const version = await getNxVersion();
  if (version.major >= 8) {
    commands.registerCommand(`nx.move`, async (uri: Uri) => {
      getTelemetry().featureUsed('nx.move');
      const generator = await selectReMoveGenerator(uri?.toString(), 'move');
      if (!generator) {
        return;
      }
      const newGenUi = GlobalConfigurationStore.instance.get(
        'useNewGenerateUiPreview'
      );
      if (newGenUi) {
        openGenerateUi(uri, generator);
      } else {
        showGenerateUi(
          context.extensionPath,
          uri,
          GeneratorType.Other,
          generator
        );
      }
    });

    commands.registerCommand(`nx.remove`, async (uri?: Uri) => {
      getTelemetry().featureUsed('nx.remove');
      const generator = await selectReMoveGenerator(uri?.toString(), 'remove');
      if (!generator) {
        return;
      }
      const newGenUi = GlobalConfigurationStore.instance.get(
        'useNewGenerateUiPreview'
      );
      if (newGenUi) {
        openGenerateUi(uri, generator);
      } else {
        showGenerateUi(
          context.extensionPath,
          uri,
          GeneratorType.Other,
          generator
        );
      }
    });
  }
}

async function showGenerateUi(
  extensionPath: string,
  uri?: Uri,
  generatorType?: GeneratorType,
  generator?: string
) {
  const { workspacePath, validWorkspaceJson } = await getNxWorkspace();
  if (!workspacePath) {
    window.showErrorMessage(
      'Nx Console requires a workspace be set to perform this action'
    );
    return;
  }
  if (!validWorkspaceJson) {
    window.showErrorMessage('Invalid configuration file');
    return;
  }
  const workspaceTreeItem = new RunTargetTreeItem(
    'generate',
    extensionPath,
    generatorType,
    generator
  );

  commands.executeCommand(
    'nxConsole.revealWebViewPanel',
    workspaceTreeItem,
    uri
  );
}
