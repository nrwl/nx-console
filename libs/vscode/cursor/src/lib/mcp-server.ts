import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  NxIdeProvider,
  NxMcpServerWrapper,
  NxWorkspaceInfoProvider,
} from '@nx-console/nx-mcp-server';
import { createGeneratorLogFileName } from '@nx-console/shared-llm-context';
import { findMatchingProject } from '@nx-console/shared-npm';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { openGenerateUIPrefilled } from '@nx-console/vscode-generate-ui-webview';
import { getOrSelectGenerator } from '@nx-console/vscode-nx-cli-quickpicks';
import {
  getGeneratorContextV2,
  getGenerators,
  getNxWorkspace,
  getNxWorkspaceProjects,
} from '@nx-console/vscode-nx-workspace';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { getNxMcpPort, vscodeLogger } from '@nx-console/vscode-utils';
import express from 'express';
import { commands, window } from 'vscode';

export interface McpServerReturn {
  server: NxMcpServerWrapper;
  app: express.Application;
  server_instance: ReturnType<express.Application['listen']>;
}

let mcpServerReturn: McpServerReturn | undefined;

export function tryStartMcpServer(workspacePath: string) {
  const port = getNxMcpPort();
  if (!port) {
    return;
  }
  const nxWorkspaceInfoProvider: NxWorkspaceInfoProvider = {
    nxWorkspace: async (_, __, reset) => await getNxWorkspace(reset),
    getGenerators: async (_, options) => await getGenerators(options),
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
      await openGenerateUIPrefilled({
        $0: 'nx',
        _: ['generate', foundGenerator.name],
        ...options,
        cwd: cwd,
      });
      const finalFileName = await createGeneratorLogFileName(
        getNxWorkspacePath(),
        foundGenerator.name,
      );
      return finalFileName;
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
  tryStartMcpServer(getNxWorkspacePath());
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
