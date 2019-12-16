import { TaskExecutionSchema } from '@angular-console/schema';
import { readArchitectDef, readBuilderSchema } from '@angular-console/server';
import { window } from 'vscode';

import { selectCliProject } from '../cli-task/cli-task-commands';
import { CliTaskProvider } from '../cli-task/cli-task-provider';
import { CliTaskQuickPickItem } from '../cli-task/cli-task-quick-pick-item';
import { getOutputChannel } from '../output-channel';
import { selectSchematic } from '../select-schematic';
import { getTelemetry } from '../telemetry';
import { verifyWorkspaceJson } from '../verify-workspace/verify-angular-json';
import { verifyBuilderDefinition } from '../verify-workspace/verify-builder-definition';
import { WorkspaceRouteTitle } from './workspace-tree-item';

export async function getTaskExecutionSchema(
  cliTaskProvider: CliTaskProvider,
  workspaceRouteTitle: WorkspaceRouteTitle = 'Run'
): Promise<TaskExecutionSchema | void> {
  try {
    if (!cliTaskProvider.getWorkspacePath()) {
      return;
    }
    const { validWorkspaceJson, json } = verifyWorkspaceJson(
      cliTaskProvider.getWorkspaceJsonPath()
    );

    if (!validWorkspaceJson) {
      return;
    }

    const command = workspaceRouteTitle.toLowerCase();
    switch (workspaceRouteTitle) {
      case 'Build':
      case 'Deploy':
      case 'E2e':
      case 'Lint':
      case 'Serve':
      case 'Test':
      case 'Xi18n':
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
          command
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
            options: builderOptions
          };
        });
      case 'Generate':
        return selectSchematic(cliTaskProvider.getWorkspacePath()).then(
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

            return schematic;
          }
        );
    }
  } catch (e) {
    const stringifiedError = e.toString ? e.toString() : JSON.stringify(e);
    getOutputChannel().appendLine(stringifiedError);
    getTelemetry().exception(stringifiedError);

    window
      .showErrorMessage(
        'Angular Console encountered an error parsing your node modules',
        'See details'
      )
      .then(value => {
        if (value) {
          getOutputChannel().show();
        }
      });
  }
}
