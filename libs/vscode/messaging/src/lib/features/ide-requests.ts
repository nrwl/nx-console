import { findMatchingProject } from '@nx-console/shared-npm';
import { getRunningTasksMap } from '@nx-console/shared-running-tasks';
import {
  GetRunningTasksResponse,
  IDE_RPC_METHODS,
} from '@nx-console/shared-types';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { getNxWorkspaceProjects } from '@nx-console/vscode-nx-workspace';
import { commands, window } from 'vscode';
import { NotificationType, RequestType } from 'vscode-jsonrpc';
import {
  MessagingNotification,
  MessagingRequest,
} from '../messaging-notification';
import { vscodeLogger } from '@nx-console/vscode-output-channels';

export const IdeFocusProject: MessagingNotification<{ projectName: string }> = {
  type: new NotificationType(IDE_RPC_METHODS.FOCUS_PROJECT),
  handler: (connectionId) => async (params) => {
    vscodeLogger.log(
      'Received Focus Project Request from MCP:',
      connectionId,
      params.projectName,
    );

    getNxWorkspaceProjects().then(async (workspaceProjects) => {
      const project = await findMatchingProject(
        params.projectName,
        workspaceProjects,
        getNxWorkspacePath(),
      );
      if (!project) {
        window.showErrorMessage(`Cannot find project "${params.projectName}"`);
        return;
      }
      commands.executeCommand('nx.graph.focus', project.name);
    });
  },
};

export const IdeFocusTask: MessagingNotification<{
  projectName: string;
  taskName: string;
}> = {
  type: new NotificationType(IDE_RPC_METHODS.FOCUS_TASK),
  handler: (connectionId) => async (params) => {
    vscodeLogger.log(
      'Received Focus Task Request from MCP:',
      connectionId,
      params.projectName,
      params.taskName,
    );
    getNxWorkspaceProjects().then(async (workspaceProjects) => {
      const project = await findMatchingProject(
        params.projectName,
        workspaceProjects,
        getNxWorkspacePath(),
      );
      if (!project) {
        window.showErrorMessage(`Cannot find project "${params.projectName}"`);
        return;
      }
      if (!project.data.targets?.[params.taskName]) {
        window.showErrorMessage(
          `Cannot find task "${params.taskName}" in project "${params.projectName}"`,
        );
        return;
      }
      commands.executeCommand('nx.graph.task', {
        projectName: project.name,
        taskName: params.taskName,
      });
    });
  },
};

export const IdeShowFullProjectGraph: MessagingNotification<void> = {
  type: new NotificationType(IDE_RPC_METHODS.SHOW_FULL_PROJECT_GRAPH),
  handler: (connectionId) => async () => {
    vscodeLogger.log(
      'Received Show Full Project Graph Request from MCP:',
      connectionId,
    );
    commands.executeCommand('nx.graph.showAll');
  },
};

export const IdeGetRunningTasks: MessagingRequest<
  undefined,
  GetRunningTasksResponse
> = {
  type: new RequestType(IDE_RPC_METHODS.GET_RUNNING_TASKS),
  handler: (connectionId) => async () => {
    vscodeLogger.log(
      'Received Get Running Tasks Request from MCP:',
      connectionId,
    );
    return {
      runningTasks: getRunningTasksMap(),
    };
  },
};
