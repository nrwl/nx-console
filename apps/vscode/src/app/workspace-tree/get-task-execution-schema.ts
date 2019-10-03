import {
  readAllSchematicCollections,
  readArchitectDef,
  readSchema
} from '@angular-console/server';
import { TaskExecutionSchema } from '@angular-console/vscode-ui/feature-task-execution-form';
import { QuickPickItem, window } from 'vscode';

import { ArchitectDef, ProjectDef } from '../ng-task/ng-task-definition';
import { WorkspaceRouteTitle } from './workspace-tree-item';
import { Schematic } from '@angular-console/schema';

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

        return;
      }

      let selectedArchitectDef: ArchitectDef | undefined;
      if (!projectName) {
        const selection = await window.showQuickPick(items);
        if (!selection) return;

        projectName = selection.projectName;
        selectedArchitectDef = selection.architectDef;
      } else {
        const projectDef = items.find(i => i.projectName === projectName);
        if (projectDef) {
          selectedArchitectDef = projectDef.architectDef;
        }
      }

      if (!projectName || !selectedArchitectDef) return;

      return {
        ...readArchitectDef(command, selectedArchitectDef, projectName),
        schema: readSchema(workspacePath, selectedArchitectDef.builder),
        title: `ng ${command} ${projectName}`
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
              schema: readSchema(workspacePath, selection.architectDef.builder),
              title: `ng run ${selection.projectName}:${selection.command}`
            }
          : undefined
      );
    case 'Generate':
      interface GenerateQuickPickItem extends QuickPickItem {
        collectionName: string;
        schematic: Schematic;
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
                schematic: s
              })
            )
        )
        .flat();

      return window.showQuickPick(schematics).then(selection => {
        if (selection) {
          return {
            ...selection.schematic,
            title: `ng generate ${selection.schematic.collection}:${
              selection.schematic.name
            }`
          };
        }
      });
  }
}
