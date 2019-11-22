import { readArchitectDef, readSchema } from '@angular-console/server';
import { TaskExecutionSchema } from '@angular-console/vscode-ui/feature-task-execution-form';
import { window } from 'vscode';

import { selectNgCliProject } from '../ng-task/ng-task-commands';
import { ProjectDef } from '../ng-task/ng-task-definition';
import { selectSchematic } from '../select-schematic';
import { WorkspaceRouteTitle } from './workspace-tree-item';
import { NgTaskQuickPickItem } from '../ng-task/ng-task-quick-pick-item';
import { getOutputChannel } from '../output-channel';
import { getTelemetry } from '../telemetry';
import { verifyAngularJson } from '../verifyWorkspace';

export async function getTaskExecutionSchema(
  workspacePath: string,
  getProjectEntries: () => [string, ProjectDef][],
  workspaceRouteTitle: WorkspaceRouteTitle = 'Run'
): Promise<TaskExecutionSchema | void> {
  try {
    if (!workspacePath) {
      return;
    }
    const { validAngularJson, json } = verifyAngularJson(workspacePath);

    if (!validAngularJson) {
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
        const selectedProject = await selectNgCliProject(command, json);

        if (!selectedProject) return;

        return {
          // TODO: Verify architect package is in node_modules
          ...readArchitectDef(
            command,
            selectedProject.architectDef,
            selectedProject.projectName
          ),
          // TODO: Verify builder package is in node_modules
          schema: readSchema(
            workspacePath,
            selectedProject.architectDef.builder
          ),
          positional: selectedProject.projectName,
          command
        };

      case 'Run':
        const runnableItems = getProjectEntries()
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
              new NgTaskQuickPickItem(
                project,
                architectDef,
                architectName,
                `${project}:${architectName}`
              )
          );

        return window.showQuickPick(runnableItems).then(selection =>
          selection
            ? {
                ...readArchitectDef(
                  command,
                  selection.command,
                  selection.projectName
                ),
                command: 'run',
                positional: `${selection.projectName}:${selection.command}`,
                // TODO: Verify builder package is in node_modules
                schema: readSchema(
                  workspacePath,
                  selection.architectDef.builder
                )
              }
            : undefined
        );
      case 'Generate':
        return selectSchematic(workspacePath).then(schematic => {
          if (!schematic) {
            return;
          }

          schematic.schema.forEach(schema => {
            if (schema.enum) {
              return;
            }

            if (schema.name === 'project') {
              schema.type = 'enum';
              schema.enum = getProjectEntries()
                .map(entry => entry[0])
                .sort();
            }
          });

          return schematic;
        });
    }
  } catch (e) {
    const stringifiedError = e.toString ? e.toString() : JSON.stringify(e);
    getOutputChannel().appendLine(stringifiedError);
    getTelemetry().exceptionOccured(stringifiedError);

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
