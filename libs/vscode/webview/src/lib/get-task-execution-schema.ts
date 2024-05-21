import {
  GeneratorType,
  isProjectOption,
  TaskExecutionSchema,
} from '@nx-console/shared/schema';
import {
  getGeneratorContextFromPath,
  getNxWorkspaceProjects,
} from '@nx-console/vscode/nx-workspace';
import { getOutputChannel } from '@nx-console/vscode/output-channels';
import { Uri, window } from 'vscode';
import { selectGenerator } from '@nx-console/vscode/nx-cli-quickpicks';

export async function getTaskExecutionSchema(
  contextMenuUri?: Uri,
  generatorType?: GeneratorType,
  incomingGenerator?: string
): Promise<TaskExecutionSchema | void> {
  try {
    const generator = await selectGenerator(
      generatorType,
      incomingGenerator
        ? {
            collection: incomingGenerator.split(':')[0],
            name: incomingGenerator.split(':')[1],
          }
        : undefined
    );

    if (!generator) {
      return;
    }

    for (const option of generator.options) {
      // TODO: mixup between items and enum has been a source for recent bugs,
      //  util.ts normalizeSchema sets items from enum.
      if (option.enum) {
        continue;
      }

      if (isProjectOption(option)) {
        const projects = Object.entries(await getNxWorkspaceProjects());
        option.enum = option.items = projects.map((entry) => entry[0]).sort();
      }
    }

    const contextValues = contextMenuUri
      ? await getGeneratorContextFromPath(generator, contextMenuUri.fsPath)
      : undefined;

    return { ...generator, contextValues };
  } catch (e) {
    const stringifiedError = e.toString ? e.toString() : JSON.stringify(e);
    getOutputChannel().appendLine(stringifiedError);

    window
      .showErrorMessage(
        'Nx Console encountered an error parsing your node modules',
        'See details'
      )
      .then((value) => {
        if (value) {
          getOutputChannel().show();
        }
      });
  }
}
