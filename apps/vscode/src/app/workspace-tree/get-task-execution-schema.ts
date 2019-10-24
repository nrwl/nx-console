import { readArchitectDef, readSchema } from '@angular-console/server';
import { TaskExecutionSchema } from '@angular-console/vscode-ui/feature-task-execution-form';
import { window } from 'vscode';

import { selectNgCliProject } from '../ng-task/ng-task-commands';
import { ProjectDef } from '../ng-task/ng-task-definition';
import { selectSchematic } from '../select-schematic';
import { WorkspaceRouteTitle } from './workspace-tree-item';
import { NgTaskQuickPickItem } from '../ng-task/ng-task-quick-pick-item';

export async function getTaskExecutionSchema(
  workspacePath: string,
  getProjectEntries: () => [string, ProjectDef][],
  workspaceRouteTitle: WorkspaceRouteTitle = 'Run'
): Promise<TaskExecutionSchema | void> {
  if (!workspacePath) {
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
      const selectedProject = await selectNgCliProject(command);

      if (!selectedProject) return;

      return {
        ...readArchitectDef(
          command,
          selectedProject.architectDef,
          selectedProject.projectName
        ),
        schema: readSchema(workspacePath, selectedProject.architectDef.builder),
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
              schema: readSchema(workspacePath, selection.architectDef.builder)
            }
          : undefined
      );
    case 'Generate':
      return selectSchematic(workspacePath);
  }
}
