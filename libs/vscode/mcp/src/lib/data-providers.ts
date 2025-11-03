import {
  IdeProvider,
  NxWorkspaceInfoProvider,
} from '@nx-console/nx-mcp-server';
import { createGeneratorLogFileName } from '@nx-console/shared-llm-context';
import { findMatchingProject } from '@nx-console/shared-npm';
import { isNxCloudUsed } from '@nx-console/shared-nx-cloud';
import { getRunningTasksMap } from '@nx-console/shared-running-tasks';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import {
  onGeneratorUiDispose,
  openGenerateUIPrefilled,
} from '@nx-console/vscode-generate-ui-webview';
import {
  getGenerators,
  getNxWorkspace,
  getNxWorkspaceProjects,
  getRecentCIPEData,
} from '@nx-console/vscode-nx-workspace';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import {
  getGitDiffs,
  isInVSCode,
  sendMessageToAgent,
} from '@nx-console/vscode-utils';
import { commands, ProgressLocation, tasks, window } from 'vscode';

export const nxWorkspaceInfoProvider: NxWorkspaceInfoProvider = {
  nxWorkspace: async (_, __, reset) => await getNxWorkspace(reset),
  getGenerators: async (_, options) => await getGenerators(options),
  getGitDiffs: async (workspacePath, baseSha, headSha) => {
    return getGitDiffs(workspacePath, baseSha, headSha);
  },
  isNxCloudEnabled: async () =>
    await isNxCloudUsed(getNxWorkspacePath(), vscodeLogger),
  getRecentCIPEData: async () => {
    // Route through nxls - getRecentCIPEData from vscode-nx-workspace already does this
    const result = await getRecentCIPEData();
    return (
      result || { error: { type: 'other', message: 'Unable to get CIPE data' } }
    );
  },
};

export const ideProvider: IdeProvider = {
  isAvailable: () => true,
  onConnectionChange: (_: (available: boolean) => void) => () => {
    // noop in vscode
  },
  dispose: () => {
    // noop in vscode
  },
  focusProject: (projectName: string) => {
    getNxWorkspaceProjects().then(async (workspaceProjects) => {
      const project = await findMatchingProject(
        projectName,
        workspaceProjects,
        getNxWorkspacePath(),
      );
      if (!project) {
        window.showErrorMessage(`Cannot find project "${projectName}"`);
        return;
      }
      commands.executeCommand('nx.graph.focus', project.name);
    });
  },
  focusTask: (projectName: string, taskName: string) => {
    getNxWorkspaceProjects().then(async (workspaceProjects) => {
      const project = await findMatchingProject(
        projectName,
        workspaceProjects,
        getNxWorkspacePath(),
      );
      if (!project) {
        window.showErrorMessage(`Cannot find project "${projectName}"`);
        return;
      }
      if (!project.data.targets?.[taskName]) {
        window.showErrorMessage(
          `Cannot find task "${taskName}" in project "${projectName}"`,
        );
        return;
      }
      commands.executeCommand('nx.graph.task', {
        projectName: project.name,
        taskName: taskName,
      });
    });
  },
  showFullProjectGraph: () => {
    commands.executeCommand('nx.graph.showAll');
  },
  openGenerateUi: async (
    generatorName: string,
    options: Record<string, unknown>,
    cwd?: string,
  ): Promise<string> => {
    const generatorInfo = {
      collection: generatorName.split(':')[0],
      name: generatorName.split(':')[1],
    };
    const foundGenerator = ((await getGenerators()) ?? []).find(
      (gen) =>
        generatorInfo.collection === gen.data?.collection &&
        (generatorInfo.name === gen.data?.name ||
          gen.data?.aliases?.includes(generatorInfo.name)),
    );
    if (!foundGenerator) {
      window.showErrorMessage(`Could not find generator "${generatorName}"`);
      throw new Error(`Could not find generator "${generatorName}"`);
    }
    await openGenerateUIPrefilled(
      {
        $0: 'nx',
        _: ['generate', foundGenerator.name],
        ...options,
        cwd: cwd,
      },
      true,
    );
    const finalFileName = await createGeneratorLogFileName(
      getNxWorkspacePath(),
      foundGenerator.name,
    );

    if (isInVSCode()) {
      window.withProgress(
        {
          location: ProgressLocation.Notification,
          title:
            'The Agent will continue running after the generator has finished...',
          cancellable: true,
        },
        async (_, cancellationToken) => {
          await new Promise<void>((resolve) => {
            let finished = false;

            const finish = () => {
              if (!finished) {
                finished = true;
                taskSubscription.dispose();
                onGenerateUiDisposable.dispose();
                resolve();
              }
            };

            const taskSubscription = tasks.onDidEndTaskProcess((event) => {
              if (event.execution.task.name.includes('wrap-generator.js')) {
                sendMessageToAgent(
                  `The generator has finished running. Please review the output in "${finalFileName}" and continue.`,
                  false,
                );
                finish();
              }
            });

            const onGenerateUiDisposable = onGeneratorUiDispose(() => {
              finish();
            });

            cancellationToken.onCancellationRequested(() => {
              finish();
            });
          });
        },
      );
    }

    return finalFileName;
  },
  getRunningTasks: async () => {
    return getRunningTasksMap();
  },
};
