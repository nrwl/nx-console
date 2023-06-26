import { commands, ExtensionContext, Uri, window } from 'vscode';

import {
  getNxWorkspace,
  getProjectByPath,
} from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from './cli-task-provider';

import { selectRunInformation } from '@nx-console/vscode/nx-cli-quickpicks';
import { getTelemetry } from '@nx-console/vscode/utils';

export async function registerCliTaskCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      `nx.run`,
      async (
        project?: string,
        target?: string,
        configuration?: string,
        askForFlags?: boolean
      ) => {
        getTelemetry().featureUsed('nx.run', { target });
        const runInformation = await selectRunInformation(
          project,
          target,
          configuration,
          askForFlags
        );
        if (
          !runInformation ||
          !runInformation.projectName ||
          !runInformation.targetName
        ) {
          return;
        }
        const { projectName, targetName, flags } = runInformation;
        runCliCommand('run', projectName, targetName, flags);
      }
    ),
    commands.registerCommand(
      `nx.run.fileexplorer`,
      async (uri: Uri | undefined) => {
        getTelemetry().featureUsed('nx.run.fileexplorer');
        if (!uri) {
          uri = window.activeTextEditor?.document.uri;
        }

        if (!uri) {
          return;
        }

        selectRunInformation(await getCliProjectFromUri(uri));
      }
    ),
    commands.registerCommand(`nx.run.target`, async () => {
      getTelemetry().featureUsed('nx.run.target');

      const runInformation = await selectRunInformation(
        undefined,
        undefined,
        undefined,
        true,
        true
      );
      if (
        !runInformation ||
        !runInformation.projectName ||
        !runInformation.targetName
      ) {
        return;
      }
      const { projectName, targetName, flags } = runInformation;
      runCliCommand('run', projectName, targetName, flags);
    })
  );
}

function runCliCommand(
  command: string,
  projectName: string,
  target: string,
  flags: string[] | undefined
) {
  if (flags !== undefined) {
    CliTaskProvider.instance.executeTask({
      positional:
        command === 'run'
          ? `${projectName}:${surroundWithQuotesIfHasWhiteSpace(target)}`
          : projectName,
      command,
      flags,
    });
  }
}

function surroundWithQuotesIfHasWhiteSpace(target: string): string {
  if (target.match(/\s/g)) {
    return `"${target}"`;
  }
  return target;
}

export async function getCliProjectFromUri(
  uri: Uri
): Promise<string | undefined> {
  const project = await getProjectByPath(uri.fsPath);
  return project?.name;
}

async function getTargetNames(): Promise<string[]> {
  const { workspace } = await getNxWorkspace();
  const commands = Object.values(workspace.projects).reduce((acc, project) => {
    for (const target of Object.keys(project.targets ?? {})) {
      acc.add(target);
    }
    return acc;
  }, new Set<string>());
  return Array.from(commands);
}

async function getProjectsWithTargetName(
  targetName: string
): Promise<string[]> {
  const { workspace } = await getNxWorkspace();
  const projects = [];
  for (const [projectName, project] of Object.entries(workspace.projects)) {
    const targets = project.targets ?? {};
    if (targets[targetName]) {
      projects.push(projectName);
    }
  }
  return projects;
}
