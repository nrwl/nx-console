import { GeneratorType } from '@nx-console/shared/schema';
import {
  selectGeneratorAndPromptForFlags,
  selectReMoveGenerator,
} from '@nx-console/vscode/nx-cli-quickpicks';
import {
  NxTreeItem,
  ProjectViewItem,
} from '@nx-console/vscode/nx-project-view';
import { RunTargetTreeItem } from '@nx-console/vscode/nx-run-target-view';
import {
  getGeneratorContextV2,
  getNxWorkspace,
} from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getTelemetry } from '@nx-console/vscode/utils';
import { ExtensionContext, Uri, commands, window } from 'vscode';
import { openGenerateUi } from './init-generate-ui-webview';
import { getNxWorkspacePath } from '@nx-console/vscode/configuration';

export async function registerGenerateCommands(context: ExtensionContext) {
  commands.registerCommand(
    `nx.generate`,
    async (
      preselectedGenerator?: string,
      preselectedFlags?: Record<string, string>
    ) => {
      getTelemetry().featureUsed('nx.generate');
      const result = await selectGeneratorAndPromptForFlags(
        preselectedGenerator,
        preselectedFlags
      );
      if (!result) {
        return;
      }
      const { generator, flags } = result;
      if (flags !== undefined) {
        CliTaskProvider.instance.executeTask({
          positional: `${generator.collectionName}:${generator.generatorName}`,
          command: 'generate',
          flags: [...flags, '--no-interactive'],
        });
      }
    }
  );

  commands.registerCommand(`nx.generate.ui`, () => {
    getTelemetry().featureUsed('nx.generate.ui');
    showGenerateUi(context.extensionPath);
  });

  commands.registerCommand(`nx.generate.ui.fileexplorer`, (uri: Uri) => {
    getTelemetry().featureUsed('nx.generate.fileexplorer');
    showGenerateUi(context.extensionPath, uri);
  });

  commands.registerCommand(
    'nx.generate.ui.projectView',
    (treeItem: NxTreeItem) => {
      getTelemetry().featureUsed('nx.generate.fileexplorer.projectView');
      openGenerateUi(
        undefined,
        undefined,
        (treeItem.item as ProjectViewItem).nxProject.project
      );
    }
  );

  commands.registerCommand(`nx.move`, async (uri?: Uri) => {
    getTelemetry().featureUsed('nx.move');
    const generator = await selectReMoveGenerator(uri?.toString(), 'move');
    if (!generator) {
      return;
    }

    openReMoveGenerator(generator, uri, undefined);
  });

  commands.registerCommand(`nx.remove`, async (uri?: Uri) => {
    getTelemetry().featureUsed('nx.remove');
    const generator = await selectReMoveGenerator(uri?.toString(), 'remove');
    if (!generator) {
      return;
    }

    openReMoveGenerator(generator, uri, undefined);
  });

  commands.registerCommand(
    `nx.move.projectView`,
    async (treeItem?: NxTreeItem) => {
      getTelemetry().featureUsed('nx.move.projectView');
      const generator = await selectReMoveGenerator(undefined, 'move');
      if (!generator) {
        return;
      }

      const projectName = (treeItem?.item as ProjectViewItem).nxProject.project;

      openReMoveGenerator(generator, undefined, projectName);
    }
  );

  commands.registerCommand(
    `nx.remove.projectView`,
    async (treeItem?: NxTreeItem) => {
      getTelemetry().featureUsed('nx.remove.projectView');
      const generator = await selectReMoveGenerator(undefined, 'remove');
      if (!generator) {
        return;
      }

      const projectName = (treeItem?.item as ProjectViewItem).nxProject.project;

      openReMoveGenerator(generator, undefined, projectName);
    }
  );

  const openReMoveGenerator = async (
    generator: string,
    uri: Uri | undefined,
    projectName: string | undefined
  ) => {
    if (!projectName && uri) {
      projectName = (await getGeneratorContextV2(uri.fsPath))?.project;
    }
    commands.executeCommand(
      'nx.generate',
      generator,
      projectName ? { projectName } : undefined
    );
  };
}

async function showGenerateUi(
  extensionPath: string,
  uri?: Uri,
  generatorType?: GeneratorType,
  generator?: string
) {
  const workspacePath = getNxWorkspacePath();
  const validWorkspaceJson = (await getNxWorkspace())?.validWorkspaceJson;
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
