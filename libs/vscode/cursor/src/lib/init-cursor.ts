import { NxUpdateMcpSseServerPortNotification } from '@nx-console/language-server-types';
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
import * as fs from 'fs';
import * as net from 'net';
import {
  ExtensionContext,
  FileSystemWatcher,
  env,
  window,
  workspace,
} from 'vscode';

const MCP_DONT_ASK_AGAIN_KEY = 'mcpDontAskAgain';

// Add a file watcher for mcp.json
let mcpJsonWatcher: FileSystemWatcher | null = null;

export function initCursor(context: ExtensionContext) {
  if (!isInCursor()) {
    return;
  }

  showMCPNotification();

  // Set up a file watcher for mcp.json
  setupMcpJsonWatcher(context);
}

function setupMcpJsonWatcher(context: ExtensionContext) {
  const mcpJsonPath = getMcpJsonPath();
  if (!mcpJsonPath) {
    return;
  }

  let lastPort = getNxMcpPort();

  // Set up a file watcher for mcp.json
  mcpJsonWatcher = workspace.createFileSystemWatcher(mcpJsonPath);

  mcpJsonWatcher.onDidChange(async (uri) => {
    getOutputChannel().appendLine(
      'mcp.json file changed, updating server port',
    );
    const port = getNxMcpPort();
    if (port !== lastPort) {
      lastPort = port;
      await syncMcpPortToLanguageServer(port);
    }
  });

  mcpJsonWatcher.onDidCreate(async (uri) => {
    getOutputChannel().appendLine(
      'mcp.json file created, updating server port',
    );
    const port = getNxMcpPort();
    if (port !== lastPort) {
      lastPort = port;
      await syncMcpPortToLanguageServer(port);
    }
  });

  mcpJsonWatcher.onDidDelete(async (uri) => {
    getOutputChannel().appendLine(
      'mcp.json file deleted, updating server port',
    );
    const port = getNxMcpPort();
    if (port !== lastPort) {
      lastPort = port;
      await syncMcpPortToLanguageServer(port);
    }
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
  await new Promise((resolve) => setTimeout(resolve, 5000));
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
