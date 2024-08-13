import {
  selectGeneratorAndPromptForFlags,
  selectReMoveGenerator,
} from '@nx-console/vscode/nx-cli-quickpicks';
import {
  NxTreeItem,
  ProjectViewItem,
} from '@nx-console/vscode/nx-project-view';
import { getGeneratorContextV2 } from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getTelemetry } from '@nx-console/vscode/telemetry';
import { ExtensionContext, Uri, commands } from 'vscode';
import { openGenerateUi } from './init-generate-ui-webview';

export async function registerGenerateCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      `nx.generate.quickpick`,
      async (
        preselectedGenerator?: string,
        preselectedFlags?: Record<string, string>
      ) => {
        if (typeof preselectedGenerator !== 'string') {
          // the command is called from a context menu, different signature - set to undefined as workaround
          preselectedGenerator = undefined;
          preselectedFlags = undefined;
        }
        getTelemetry().logUsage('nx.generate.quickpick');
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
    ),
    commands.registerCommand(`nx.generate.ui`, () => {
      getTelemetry().logUsage('nx.generate.ui');
      openGenerateUi();
    }),
    commands.registerCommand(`nx.generate.ui.fileexplorer`, (uri: Uri) => {
      getTelemetry().logUsage('nx.generate.fileexplorer');
      openGenerateUi(uri);
    }),
    commands.registerCommand(
      'nx.generate.ui.projectView',
      (treeItem: NxTreeItem) => {
        getTelemetry().logUsage('nx.generate.fileexplorer.projectView');
        openGenerateUi(
          undefined,
          undefined,
          (treeItem.item as ProjectViewItem).nxProject.project
        );
      }
    ),
    commands.registerCommand(`nx.move`, async (uri?: Uri) => {
      getTelemetry().logUsage('nx.move');
      const generator = await selectReMoveGenerator(uri?.toString(), 'move');
      if (!generator) {
        return;
      }

      openReMoveGenerator(generator, uri, undefined);
    }),
    commands.registerCommand(`nx.remove`, async (uri?: Uri) => {
      getTelemetry().logUsage('nx.remove');
      const generator = await selectReMoveGenerator(uri?.toString(), 'remove');
      if (!generator) {
        return;
      }

      openReMoveGenerator(generator, uri, undefined);
    }),
    commands.registerCommand(
      `nx.move.projectView`,
      async (treeItem?: NxTreeItem) => {
        getTelemetry().logUsage('nx.move.projectView');
        const generator = await selectReMoveGenerator(undefined, 'move');
        if (!generator) {
          return;
        }

        const projectName = (treeItem?.item as ProjectViewItem).nxProject
          .project;

        openReMoveGenerator(generator, undefined, projectName);
      }
    ),
    commands.registerCommand(
      `nx.remove.projectView`,
      async (treeItem?: NxTreeItem) => {
        getTelemetry().logUsage('nx.remove.projectView');
        const generator = await selectReMoveGenerator(undefined, 'remove');
        if (!generator) {
          return;
        }

        const projectName = (treeItem?.item as ProjectViewItem).nxProject
          .project;

        openReMoveGenerator(generator, undefined, projectName);
      }
    )
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
      'nx.generate.quickpick',
      generator,
      projectName ? { projectName } : undefined
    );
  };
}
