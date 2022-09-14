import {
  GeneratorType,
  Option,
  TaskExecutionSchema,
} from '@nx-console/shared/schema';
import {
  getOutputChannel,
  getTelemetry,
  getWorkspacePath,
  outputLogger,
  readTargetDef,
} from '@nx-console/vscode/utils';
import { verifyBuilderDefinition } from '@nx-console/vscode/verify';
import { Uri, window } from 'vscode';
import {
  CliTaskProvider,
  CliTaskQuickPickItem,
  selectCliProject,
  selectGenerator,
} from '@nx-console/vscode/tasks';
import { findProjectWithPath, nxWorkspace } from '@nx-console/shared/workspace';

export async function getTaskExecutionSchema(
  cliTaskProvider: CliTaskProvider,
  command = 'run',
  contextMenuUri?: Uri,
  generatorType?: GeneratorType,
  incomingGenerator?: string
): Promise<TaskExecutionSchema | void> {
  try {
    if (!cliTaskProvider.getWorkspacePath()) {
      return;
    }
    const { validWorkspaceJson, workspace, workspaceType } = await nxWorkspace(
      getWorkspacePath(),
      outputLogger
    );

    if (!validWorkspaceJson) {
      return;
    }
    const lowerCommand = command.toLowerCase();
    switch (lowerCommand) {
      case 'run': {
        const runnableItems = (await cliTaskProvider.getProjectEntries())
          .filter(([, { targets }]) => Boolean(targets))
          .flatMap(([project, { targets, root }]) => ({
            project,
            targets,
            root,
          }))
          .flatMap(({ project, targets, root }) => [
            ...Object.entries(targets || {}).map(([targetName, targetDef]) => ({
              project,
              targetName,
              targetDef,
              root,
            })),
          ])
          .map(
            ({ project, targetName, targetDef, root }) =>
              new CliTaskQuickPickItem(
                project,
                root,
                targetDef,
                targetName,
                `${project}:${targetName}`
              )
          );

        return window.showQuickPick(runnableItems).then(async (selection) => {
          if (!selection) {
            return;
          }

          const { validBuilder, options } = await verifyBuilderDefinition(
            selection.projectName,
            selection.command,
            workspace,
            workspaceType
          );
          if (!validBuilder) {
            return;
          }

          return {
            ...readTargetDef(
              selection.command,
              selection.targetDef,
              selection.projectName
            ),
            command: 'run',
            positional: `${selection.projectName}:${selection.command}`,
            options,
            cliName: workspaceType,
          };
        });
      }
      case 'generate': {
        const generator = await selectGenerator(
          cliTaskProvider.getWorkspacePath(),
          workspaceType,
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
            const projects = await cliTaskProvider.getProjectEntries();
            option.enum = option.items = projects
              .map((entry) => entry[0])
              .sort();
          }
        }

        const contextValues = contextMenuUri
          ? await getConfigValuesFromContextMenuUri(
              generator,
              contextMenuUri,
              cliTaskProvider
            )
          : undefined;

        return { ...generator, cliName: workspaceType, contextValues };
      }
      default: {
        const selectedProject = await selectCliProject(command, workspace);

        if (!selectedProject) return;

        const { validBuilder, options } = await verifyBuilderDefinition(
          selectedProject.projectName,
          command,
          workspace,
          workspaceType
        );
        if (!validBuilder) {
          return;
        }
        return {
          // TODO: Verify architect package is in node_modules
          ...readTargetDef(
            command,
            selectedProject.targetDef,
            selectedProject.projectName
          ),
          options,
          positional: selectedProject.projectName,
          command,
          cliName: workspaceType,
        };
      }
    }
  } catch (e) {
    const stringifiedError = e.toString ? e.toString() : JSON.stringify(e);
    getOutputChannel().appendLine(stringifiedError);
    getTelemetry().exception(stringifiedError);

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

// Get information about where the user clicked if invoked through right click in the explorer context menu
async function getConfigValuesFromContextMenuUri(
  generator: TaskExecutionSchema,
  contextMenuUri: Uri | undefined,
  cliTaskProvider: CliTaskProvider
): Promise<
  | {
      path?: string;
      directory?: string;
      project?: string;
      projectName?: string;
    }
  | undefined
> {
  if (contextMenuUri) {
    const workspacePath = getWorkspacePath();
    const project = await findProjectWithPath(
      contextMenuUri.fsPath,
      workspacePath
    );
    const projectName = (project && project.name) || undefined;

    let path = contextMenuUri.fsPath
      .replace(workspacePath, '')
      .replace(/\\/g, '/')
      .replace(/^\//, '');

    const { workspaceLayout } = await nxWorkspace(
      getWorkspacePath(),
      outputLogger
    );
    const appsDir = workspaceLayout.appsDir;
    const libsDir = workspaceLayout.libsDir;
    if (
      (appsDir && generator.name === 'application') ||
      generator.name === 'app'
    ) {
      path = path.replace(appsDir, '').replace(/^\//, '');
    }
    if ((libsDir && generator.name === 'library') || generator.name === 'lib') {
      path = path.replace(libsDir, '').replace(/^\//, '');
    }

    return {
      project: projectName,
      projectName,
      path,
      ...(!(projectName && generator.options.some(isProjectOption)) && {
        directory: path,
      }),
    };
  }
}

function isProjectOption(option: Option) {
  return (
    option.name === 'project' ||
    option.name === 'projectName' ||
    option.$default?.$source === 'projectName' ||
    option['x-dropdown'] === 'projects'
  );
}
