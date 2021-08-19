import { Option, TaskExecutionSchema } from '@nx-console/schema';
import {
  getOutputChannel,
  getTelemetry,
  readTargetDef,
  selectSchematic,
} from '@nx-console/server';
import { getNxConfig, verifyWorkspace } from '@nx-console/vscode/nx-workspace';
import { verifyBuilderDefinition } from '@nx-console/vscode/verify';
import { Uri, window } from 'vscode';
import { WorkspaceRouteTitle } from '@nx-console/vscode/nx-run-target-view';
import {
  CliTaskProvider,
  CliTaskQuickPickItem,
  selectCliProject,
} from '@nx-console/vscode/tasks';

export async function getTaskExecutionSchema(
  cliTaskProvider: CliTaskProvider,
  workspaceRouteTitle: WorkspaceRouteTitle = 'Run',
  contextMenuUri?: Uri
): Promise<TaskExecutionSchema | void> {
  try {
    if (!cliTaskProvider.getWorkspacePath()) {
      return;
    }
    const { validWorkspaceJson, json, workspaceType } = verifyWorkspace();

    if (!validWorkspaceJson) {
      return;
    }

    const command = workspaceRouteTitle.toLowerCase();
    switch (workspaceRouteTitle) {
      case 'Build':
      case 'E2E':
      case 'Lint':
      case 'Serve':
      case 'Test': {
        const selectedProject = await selectCliProject(command, json);

        if (!selectedProject) return;

        const { validBuilder, options } = await verifyBuilderDefinition(
          selectedProject.projectName,
          command,
          json
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
      case 'Run': {
        const runnableItems = cliTaskProvider
          .getProjectEntries()
          .filter(([, { targets }]) => Boolean(targets))
          .flatMap(([project, { targets }]) => ({ project, targets }))
          .flatMap(({ project, targets }) => [
            ...Object.entries(targets || {}).map(([targetName, targetDef]) => ({
              project,
              targetName,
              targetDef,
            })),
          ])
          .map(
            ({ project, targetName, targetDef }) =>
              new CliTaskQuickPickItem(
                project,
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
            json
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
      case 'Generate': {
        return selectSchematic(cliTaskProvider.getWorkspaceJsonPath()).then(
          (schematic) => {
            if (!schematic) {
              return;
            }

            schematic.options.forEach((option) => {
              // TODO: mixup between items and enum has been a source for recent bugs,
              //  util.ts normalizeSchema sets items from enum.
              if (option.enum) {
                return;
              }

              if (isProjectOption(option)) {
                option.enum = option.items = cliTaskProvider
                  .getProjectEntries()
                  .map((entry) => entry[0])
                  .sort();
              }
            });

            const contextValues = contextMenuUri
              ? getConfigValuesFromContextMenuUri(
                  schematic,
                  contextMenuUri,
                  cliTaskProvider
                )
              : undefined;

            return { ...schematic, cliName: workspaceType, contextValues };
          }
        );
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
function getConfigValuesFromContextMenuUri(
  schematic: TaskExecutionSchema,
  contextMenuUri: Uri | undefined,
  cliTaskProvider: CliTaskProvider
):
  | {
      path?: string;
      directory?: string;
      project?: string;
      projectName?: string;
    }
  | undefined {
  if (contextMenuUri) {
    const project = cliTaskProvider.projectForPath(contextMenuUri.fsPath);
    const projectName = (project && project.name) || undefined;

    const workspacePath = cliTaskProvider.getWorkspacePath();
    let path = contextMenuUri.fsPath
      .replace(workspacePath, '')
      .replace(/\\/g, '/')
      .replace(/^\//, '');
    const nxConfig = getNxConfig(workspacePath);
    const appsDir = nxConfig.workspaceLayout?.appsDir ?? 'apps';
    const libsDir = nxConfig.workspaceLayout?.libsDir ?? 'libs';
    if (
      (appsDir && schematic.name === 'application') ||
      schematic.name === 'app'
    ) {
      path = path.replace(appsDir, '').replace(/^\//, '');
    }
    if ((libsDir && schematic.name === 'library') || schematic.name === 'lib') {
      path = path.replace(libsDir, '').replace(/^\//, '');
    }

    return {
      project: projectName,
      projectName,
      path,
      ...(!(projectName && schematic.options.some(isProjectOption)) && {
        directory: path,
      }),
    };
  }
}

function isProjectOption(option: Option) {
  return (
    option.name === 'project' ||
    option.name === 'projectName' ||
    (option.$default && option.$default.$source === 'projectName')
  );
}
