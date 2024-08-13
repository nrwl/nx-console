import { commands, ExtensionContext, Uri, window } from 'vscode';

import { getProjectByPath } from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from './cli-task-provider';

import { selectRunInformation } from '@nx-console/vscode/nx-cli-quickpicks';
import { getTelemetry } from '@nx-console/vscode/telemetry';

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
        getTelemetry().logUsage('nx.run', { target });
        selectRunInformationAndRun(project, target, configuration, askForFlags);
      }
    ),
    commands.registerCommand(
      `nx.run.fileexplorer`,
      async (uri: Uri | undefined) => {
        getTelemetry().logUsage('nx.run.fileexplorer');
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
      getTelemetry().logUsage('nx.run.target');

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
    !runInformation.targetName ||
    !runInformation.flags
  ) {
    return;
  }
  const {
    projectName: p,
    targetName: t,
    configuration: c,
    flags: f,
  } = runInformation;

  const positional = c
    ? `${p}:${surroundWithQuotesIfHasWhiteSpace(t)}:${c}`
    : `${p}:${surroundWithQuotesIfHasWhiteSpace(t)}`;
  CliTaskProvider.instance.executeTask({
    positional,
    command: 'run',
    flags: f,
  });
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
