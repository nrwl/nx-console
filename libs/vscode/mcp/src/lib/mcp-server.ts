import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  NxMcpServerWrapper,
  NxWorkspaceInfoProvider,
  NxIdeProvider,
} from '@nx-console/nx-mcp-server';
import { findMatchingProject } from '@nx-console/shared-npm';
import { isNxCloudUsed } from '@nx-console/shared-nx-cloud';
import { IdeCallbackMessage } from '@nx-console/shared-types';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import {
  getGenerators,
  getNxWorkspace,
  getNxWorkspaceProjects,
} from '@nx-console/vscode-nx-workspace';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { getNxMcpPort, vscodeLogger } from '@nx-console/vscode-utils';
import {
  commands,
  tasks,
  TaskExecution,
  TaskEndEvent,
  Disposable,
} from 'vscode';
import express from 'express';
import { window } from 'vscode';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import {
  getGitDiffs,
  getNxMcpPort,
  vscodeLogger,
} from '@nx-console/vscode-utils';
import express from 'express';
import { commands, window } from 'vscode';
import { CliTaskProvider } from '@nx-console/vscode-tasks';
import { CliTask } from '@nx-console/vscode-tasks/src/lib/cli-task';
import { CliTaskDefinition } from '@nx-console/vscode-tasks/src/lib/cli-task-definition';

export interface McpServerReturn {
  server: NxMcpServerWrapper;
  app: express.Application;
  server_instance: ReturnType<express.Application['listen']>;
}

let mcpServerReturn: McpServerReturn | undefined;

export async function tryStartMcpServer(workspacePath: string) {
  const port = getNxMcpPort();
  if (!port) {
    return;
  }

  const nxWorkspaceInfoProvider: NxWorkspaceInfoProvider = {
    nxWorkspace: async (_, __, reset) => await getNxWorkspace(reset),
    getGenerators: async (_, options) => await getGenerators(options),
    getGitDiffs: async (workspacePath, baseSha, headSha) => {
      return getGitDiffs(workspacePath, baseSha, headSha);
    },
    isNxCloudEnabled: await isNxCloudUsed(workspacePath, vscodeLogger),
  };

  const ideProvider: NxIdeProvider = {
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
    runGeneratorInTerminal: async (
      generatorName: string,
      options: string,
      cwd?: string,
    ): Promise<string> => {
      return new Promise<string>(async (resolve) => {
        try {
          // Parse options string into individual flags
          const flags = options
            .split(' ')
            .filter((part) => part.trim() !== '')
            .concat(['--no-interactive']);

          // Create the task definition
          const taskDefinition: CliTaskDefinition = {
            command: 'generate',
            positional: generatorName,
            flags: flags,
            cwd: cwd,
          };

          // Create a CLI task
          const task = await CliTask.create(taskDefinition);
          if (!task) {
            resolve('Failed to create task for generator execution');
            return;
          }

          await tasks.executeTask(task);

          let disposable: Disposable | undefined;

          disposable = tasks.onDidEndTaskProcess((e: TaskEndEvent) => {
            disposable?.dispose();
            resolve('Generator executed');
          });
        } catch (error) {
          resolve(
            `Error executing generator: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      });
    },
  };

  const server = new NxMcpServerWrapper(
    workspacePath,
    nxWorkspaceInfoProvider,
    ideProvider,
    getTelemetry(),
    vscodeLogger,
  );

  const app = express();
  let transport: SSEServerTransport;
  app.get('/sse', async (req, res) => {
    vscodeLogger.log('SSE connection established');
    transport = new SSEServerTransport('/messages', res);
    await server.getMcpServer().connect(transport);
  });

  app.post('/messages', async (req, res) => {
    if (!transport) {
      res.status(400).send('No transport found');
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  const server_instance = app.listen(port);
  vscodeLogger.log(`MCP server started on port ${port}`);

  mcpServerReturn = { server, app, server_instance };
}

export async function restartMcpServer() {
  stopMcpServer();
  await tryStartMcpServer(getNxWorkspacePath());
}

export function stopMcpServer() {
  if (mcpServerReturn) {
    getOutputChannel().appendLine('Stopping MCP server');
    mcpServerReturn.server_instance.close();
  }
}

export function updateMcpServerWorkspacePath(workspacePath: string) {
  if (mcpServerReturn) {
    mcpServerReturn.server.setNxWorkspacePath(workspacePath);
  }
}
