import {
  IdeProvider,
  NxWorkspaceInfoProvider,
} from '@nx-console/nx-mcp-server';
import { findMatchingProject } from '@nx-console/shared-npm';
import { isNxCloudUsed } from '@nx-console/shared-nx-cloud';
import { getRunningTasksMap } from '@nx-console/shared-running-tasks';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import {
  getGenerators,
  getNxWorkspace,
  getNxWorkspaceProjects,
  getRecentCIPEData,
} from '@nx-console/vscode-nx-workspace';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { getGitDiffs } from '@nx-console/vscode-utils';
import { commands, window } from 'vscode';

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
  getRunningTasks: async () => {
    return getRunningTasksMap();
  },
};
