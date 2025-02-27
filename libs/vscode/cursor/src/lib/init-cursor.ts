import {
  NxMcpIdeCallbackNotification,
  NxUpdateMcpSseServerPortNotification,
} from '@nx-console/language-server-types';
import { WorkspaceConfigurationStore } from '@nx-console/vscode-configuration';
import { getNxlsClient } from '@nx-console/vscode-lsp-client';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import {
  ensureCursorDirExists,
  getMcpJsonPath,
  getNxMcpPort,
  hasNxMcpEntry,
  readMcpJson,
  writeMcpJson,
} from '@nx-console/vscode-utils';
import * as net from 'net';
import {
  ExtensionContext,
  FileSystemWatcher,
  commands,
  env,
  window,
  workspace,
} from 'vscode';
import { getNxWorkspaceProjects } from '@nx-console/vscode-nx-workspace';

const MCP_DONT_ASK_AGAIN_KEY = 'mcpDontAskAgain';

let mcpJsonWatcher: FileSystemWatcher | null = null;

export function initCursor(context: ExtensionContext) {
  if (!isInCursor()) {
    commands.executeCommand('setContext', 'isInCursor', false);
    return;
  }

  commands.executeCommand('setContext', 'isInCursor', true);
  commands.executeCommand('setContext', 'hasNxMcpConfigured', hasNxMcpEntry());

  showMCPNotification();

  setupMcpJsonWatcher(context);

  context.subscriptions.push(
    commands.registerCommand('nx.configureMcpServer', async () => {
      await updateMcpJson();
    }),
  );

  getNxlsClient().onNotification(
    NxMcpIdeCallbackNotification,
    async ({ type, payload }) => {
      if (type === 'focus-project') {
        const workspaceProjects = await getNxWorkspaceProjects();
        if (!workspaceProjects || !workspaceProjects[payload.projectName]) {
          window.showErrorMessage(
            `Cannot find project "${payload.projectName}"`,
          );
          return;
        }
        commands.executeCommand('nx.graph.focus', payload.projectName);
      } else if (type === 'focus-task') {
        const workspaceProjects = await getNxWorkspaceProjects();
        if (!workspaceProjects || !workspaceProjects[payload.projectName]) {
          window.showErrorMessage(
            `Cannot find project "${payload.projectName}"`,
          );
          return;
        }
        if (
          !workspaceProjects[payload.projectName].data.targets?.[
            payload.taskName
          ]
        ) {
          window.showErrorMessage(
            `Cannot find task "${payload.taskName}" in project "${payload.projectName}"`,
          );
          return;
        }

        commands.executeCommand('nx.graph.task', {
          projectName: payload.projectName,
          taskName: payload.taskName,
        });
      }
    },
  );
}

function setupMcpJsonWatcher(context: ExtensionContext) {
  const mcpJsonPath = getMcpJsonPath();
  if (!mcpJsonPath) {
    return;
  }

  let lastPort = getNxMcpPort();

  mcpJsonWatcher = workspace.createFileSystemWatcher(mcpJsonPath);

  const handleMcpJsonChange = async (eventMessage: string) => {
    getOutputChannel().appendLine(eventMessage);
    const port = getNxMcpPort();
    if (port !== lastPort) {
      lastPort = port;
      await syncMcpPortToLanguageServer(port);
    }

    commands.executeCommand(
      'setContext',
      'hasNxMcpConfigured',
      hasNxMcpEntry(),
    );
  };

  mcpJsonWatcher.onDidChange(async (uri) => {
    await handleMcpJsonChange('mcp.json file changed, updating server port');
  });

  mcpJsonWatcher.onDidCreate(async (uri) => {
    await handleMcpJsonChange('mcp.json file created, updating server port');
  });

  mcpJsonWatcher.onDidDelete(async (uri) => {
    await handleMcpJsonChange('mcp.json file deleted, updating server port');
  });

  context.subscriptions.push(mcpJsonWatcher);
}

async function syncMcpPortToLanguageServer(port: number | undefined) {
  if (port) {
    getOutputChannel().appendLine(
      `Synchronizing MCP port ${port} from mcp.json to language server`,
    );
    const nxlsClient = getNxlsClient();
    if (nxlsClient) {
      await nxlsClient.sendNotification(
        NxUpdateMcpSseServerPortNotification,
        port,
      );
    }
  }
}

async function showMCPNotification() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const dontAskAgain = WorkspaceConfigurationStore.instance.get(
    MCP_DONT_ASK_AGAIN_KEY,
    false,
  );

  if (dontAskAgain) {
    return;
  }

  if (hasNxMcpEntry()) {
    return;
  }

  const answer = await window.showInformationMessage(
    'Improve Cursor Agents with Nx-specific context?',
    'Yes',
    "Don't ask again",
  );

  if (answer === "Don't ask again") {
    WorkspaceConfigurationStore.instance.set(MCP_DONT_ASK_AGAIN_KEY, true);
  }

  if (answer === 'Yes') {
    await updateMcpJson();
  }
}

async function updateMcpJson() {
  if (!ensureCursorDirExists()) {
    return false;
  }

  if (hasNxMcpEntry()) {
    return true;
  }

  const port = await findAvailablePort();
  if (!port) {
    window.showErrorMessage(
      'Failed to find an available port for MCP SSE server',
    );
    return false;
  }

  const mcpJson = readMcpJson() || { mcpServers: {} };

  if (!mcpJson.mcpServers) {
    mcpJson.mcpServers = {};
  }

  mcpJson.mcpServers['nx-mcp'] = {
    url: `http://localhost:${port}/sse`,
  };

  if (!writeMcpJson(mcpJson)) {
    window.showErrorMessage('Failed to write to mcp.json');
    return false;
  }

  window
    .showInformationMessage(
      `Nx MCP Server configured successfully. Make sure it's enabled in Cursor Settings -> MCP`,
      'Open Settings',
    )
    .then((result) => {
      if (result === 'Open Settings') {
        commands.executeCommand('aiSettings.action.open');
      }
    });

  return true;
}

/**
 * Generates a random port number and checks if it's available
 * @returns A promise that resolves to an available port number or null if none found
 */
async function findAvailablePort(): Promise<number | null> {
  // Try up to 100 times to find an available port
  for (let i = 0; i < 10; i++) {
    // Generate a random port between 3000 and 10000
    const port = Math.floor(Math.random() * 7000) + 3000;

    if (await isPortAvailable(port)) {
      return port;
    }
  }

  return null;
}

/**
 * Checks if a port is available by attempting to create a server on that port
 * @param port The port to check
 * @returns A promise that resolves to true if the port is available, false otherwise
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port);
  });
}

export function isInCursor() {
  return env.appName.toLowerCase().includes('cursor');
}
