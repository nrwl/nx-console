import { TaskExecutionSchema } from '@nx-console/schema';
import { readArchitectDef, readBuilderSchema } from '@nx-console/server';
import { window, Uri } from 'vscode';

import { selectCliProject } from '../cli-task/cli-task-commands';
import { CliTaskProvider } from '../cli-task/cli-task-provider';
import { CliTaskQuickPickItem } from '../cli-task/cli-task-quick-pick-item';
import { getOutputChannel } from '../output-channel';
import { selectSchematic } from '../select-schematic';
import { getTelemetry } from '../telemetry';
import { verifyWorkspace } from '../verify-workspace/verify-workspace';
import { verifyBuilderDefinition } from '../verify-workspace/verify-builder-definition';
import { WorkspaceRouteTitle } from './workspace-tree-item';

export async function getTaskExecutionSchema(
  cliTaskProvider: CliTaskProvider,
  workspaceRouteTitle: WorkspaceRouteTitle = 'Run',
  contextMenuUri?: Uri | undefined
): Promise<TaskExecutionSchema | void> {
  try {
    if (!cliTaskProvider.getWorkspacePath()) {
      return;
    }
    const { validWorkspaceJson, json, workspaceType } = verifyWorkspace(
      cliTaskProvider.getWorkspacePath()
    );

    if (!validWorkspaceJson) {
      return;
    }

    const command = workspaceRouteTitle.toLowerCase();
    switch (workspaceRouteTitle) {
      case 'Build':
      case 'E2e':
      case 'Lint':
      case 'Serve':
      case 'Test':
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
          ...readArchitectDef(
            command,
            selectedProject.architectDef,
            selectedProject.projectName
          ),
          options,
          positional: selectedProject.projectName,
          command,
          cliName: workspaceType
        };

      case 'Run':
        const runnableItems = cliTaskProvider
          .getProjectEntries()
          .filter(([_, { architect }]) => Boolean(architect))
          .flatMap(([project, { architect }]) => ({ project, architect }))
          .flatMap(({ project, architect }) => [
            ...Object.entries(architect!).map(
              ([architectName, architectDef]) => ({
                project,
                architectName,
                architectDef
              })
            )
          ])
          .map(
            ({ project, architectName, architectDef }) =>
              new CliTaskQuickPickItem(
                project,
                architectDef,
                architectName,
                `${project}:${architectName}`
              )
          );

        return window.showQuickPick(runnableItems).then(async selection => {
          if (!selection) {
            return;
          }

          const builderOptions = await readBuilderSchema(
            cliTaskProvider.getWorkspacePath(),
            selection.architectDef.builder
          );

          if (!builderOptions) {
            return;
          }

          return {
            ...readArchitectDef(
              command,
              selection.command,
              selection.projectName
            ),
            command: 'run',
            positional: `${selection.projectName}:${selection.command}`,
            options: builderOptions,
            cliName: workspaceType
          };
        });
      case 'Generate':
        return selectSchematic(cliTaskProvider.getWorkspaceJsonPath()).then(
          schematic => {
            if (!schematic) {
              return;
            }

            schematic.options.forEach(s => {
              if (s.enum) {
                return;
              }

              if (s.name === 'project') {
                s.enum = cliTaskProvider
                  .getProjectEntries()
                  .map(entry => entry[0])
                  .sort();
              }
            });

            const contextValues = contextMenuUri
              ? getConfigValuesFromContextMenuUri(
                  contextMenuUri,
                  cliTaskProvider
                )
              : undefined;

            return { ...schematic, cliName: workspaceType, contextValues };
          }
        );
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
      .then(value => {
        if (value) {
          getOutputChannel().show();
        }
      });
  }
}

// Get information about where the user clicked if invoked through right click in the explorer context menu
function getConfigValuesFromContextMenuUri(
  contextMenuUri: Uri | undefined,
  cliTaskProvider: CliTaskProvider
): { path: string; project?: string } | undefined {
  if (contextMenuUri) {
    const project = cliTaskProvider.projectForPath(contextMenuUri.fsPath);
    const projectName = (project && project.name) || undefined;

    return {
      path: contextMenuUri.fsPath
        .replace(cliTaskProvider.getWorkspacePath(), '')
        .replace(/\\/g, '/'),
      project: projectName
    };
  }
}
