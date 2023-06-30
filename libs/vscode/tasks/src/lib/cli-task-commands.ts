import { commands, ExtensionContext, Uri, window } from 'vscode';

import { getProjectByPath } from '@nx-console/vscode/nx-workspace';
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
        selectRunInformationAndRun(project, target, configuration, askForFlags);
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

        selectRunInformationAndRun(await getCliProjectFromUri(uri));
      }
    ),
    commands.registerCommand(`nx.run.target`, async () => {
      getTelemetry().featureUsed('nx.run.target');

      selectRunInformationAndRun(undefined, undefined, undefined, true, true);
    })
  );
}

async function selectRunInformationAndRun(
  projectName?: string,
  targetName?: string,
  configuration?: string,
  askForFlags = true,
  selectTargetFirst = false
) {
  const runInformation = await selectRunInformation(
    projectName,
    targetName,
    configuration,
    askForFlags,
    selectTargetFirst
  );
  if (
    !runInformation ||
    !runInformation.projectName ||
    !runInformation.targetName
  ) {
    return;
  }
  const { projectName: p, targetName: t, flags: f } = runInformation;
  runCliCommand('run', p, t, f);
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
