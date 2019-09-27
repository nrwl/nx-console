import {
  EXTENSIONS,
  readAllSchematicCollections,
  readArchitectDef,
  readSchema
} from '@angular-console/server';
import { QuickPickItem, window } from 'vscode';

import { ProjectDef, ArchitectDef } from '../ng-task/ng-task-definition';
import { WorkspaceRouteTitle } from './workspace-tree-item';
import { TaskExecutionSchema } from '@angular-console/vscode-ui/feature-task-execution-form';

export class NgTaskQuickPickItem implements QuickPickItem {
  constructor(
    readonly projectName: string,
    readonly architectDef: ArchitectDef,
    readonly command: string,
    readonly label: string
  ) {}
}

export async function getTaskExecutionSchema(
  workspacePath: string,
  getProjectEntries: () => [string, ProjectDef][],
  workspaceRouteTitle: WorkspaceRouteTitle = 'Run',
  projectName?: string
): Promise<TaskExecutionSchema | undefined> {
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
      const items = getProjectEntries()
        .filter(([_, { architect }]) => Boolean(architect))
        .flatMap(([project, { architect }]) => ({ project, architect }))
        .filter(({ architect }) => Boolean(architect && architect[command]))
        .map(
          ({ project, architect }) =>
            new NgTaskQuickPickItem(
              project,
              architect![command]!,
              command,
              project
            )
        );

      if (!items.length) {
        window.showInformationMessage(
          `None of your projects support ng ${command}`
        );

        return undefined;
      }

      let architect: ArchitectDef | undefined;
      if (!projectName) {
        const selection = await window.showQuickPick(items);
        if (!selection) return;

        projectName = selection.projectName;
        architect = selection.architectDef;
      } else {
        const projectDef = items.find(i => i.projectName === projectName);
        if (projectDef) {
          architect = projectDef.architectDef;
        }
      }

      if (!projectName || !architect) return;

      return {
        ...readArchitectDef(command, architect, projectName),
        schema: readSchema(workspacePath, architect.builder)
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
              ...readArchitectDef(command, architect, selection.projectName),
              schema: readSchema(workspacePath, selection.architectDef.builder)
            }
          : undefined
      );
    case 'Add':
      const extensions = Object.entries(EXTENSIONS).map(
        ([label, description]): QuickPickItem => ({
          label,
          description
        })
      );
      return window.showQuickPick(extensions).then(_selection => {
        window.showErrorMessage('Not yet implemented');
        return undefined;
      });
    case 'Generate':
      interface GenerateQuickPickItem extends QuickPickItem {
        collectionName: string;
        schematicName: string;
      }

      const schematics = readAllSchematicCollections(
        workspacePath,
        'tools/schematics', // TODO: Make these values auto detectable / configurable
        'workspace-schematic' // TODO: Make these values auto detectable / configurable
      )
        .map(
          (c): GenerateQuickPickItem[] =>
            c.schematics.map(
              (s): GenerateQuickPickItem => ({
                description: s.description,
                label: `${c.name} - ${s.name}`,
                collectionName: c.name,
                schematicName: s.name
              })
            )
        )
        .flat();

      return window.showQuickPick(schematics).then(_selection => {
        window.showErrorMessage('Not yet implemented');
        return undefined;
      });
  }
}
