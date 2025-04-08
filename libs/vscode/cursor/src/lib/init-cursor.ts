import {
  getNxWorkspacePath,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode-configuration';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import {
  ensureCursorDirExists,
  getMcpJsonPath,
  getNxMcpPort,
  hasNxMcpEntry,
  readMcpJson,
  writeMcpJson,
} from '@nx-console/vscode-utils';
import {
  commands,
  env,
  ExtensionContext,
  FileSystemWatcher,
  window,
  workspace,
} from 'vscode';
import { restartMcpServer, tryStartMcpServer } from './mcp-server';
import { findAvailablePort } from './ports';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { checkIsNxWorkspace } from '@nx-console/shared-npm';
const MCP_DONT_ASK_AGAIN_KEY = 'mcpDontAskAgain';

let mcpJsonWatcher: FileSystemWatcher | null = null;
let hasInitializedCursor = false;

export async function initCursor(context: ExtensionContext) {
  if (hasInitializedCursor) {
    return;
  }
  if (!isInCursor()) {
    commands.executeCommand('setContext', 'isInCursor', false);
    return;
  }
  commands.executeCommand('setContext', 'isInCursor', true);

  if (!(await checkIsNxWorkspace(getNxWorkspacePath()))) {
    return;
  }
  hasInitializedCursor = true;

  commands.executeCommand('setContext', 'hasNxMcpConfigured', hasNxMcpEntry());

  await tryStartMcpServer(getNxWorkspacePath());

  showMCPNotification();

  setupMcpJsonWatcher(context);

  context.subscriptions.push(
    commands.registerCommand('nx.configureMcpServer', async () => {
      await updateMcpJson();
    }),
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
      await restartMcpServer();
    }

    commands.executeCommand(
      'setContext',
      'hasNxMcpConfigured',
      hasNxMcpEntry(),
    );
  };

  mcpJsonWatcher.onDidChange(async () => {
    await handleMcpJsonChange('mcp.json file changed, updating server port');
  });

  mcpJsonWatcher.onDidCreate(async () => {
    await handleMcpJsonChange('mcp.json file created, updating server port');
  });

  mcpJsonWatcher.onDidDelete(async () => {
    await handleMcpJsonChange('mcp.json file deleted, updating server port');
  });

  context.subscriptions.push(mcpJsonWatcher);
}

async function showMCPNotification() {
  await new Promise((resolve) => setTimeout(resolve, 20000));
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

  window
    .showInformationMessage(
      'Improve Cursor Agents with Nx-specific context?',
      'Yes',
      "Don't ask again",
    )
    .then((answer) => {
      if (answer === "Don't ask again") {
        WorkspaceConfigurationStore.instance.set(MCP_DONT_ASK_AGAIN_KEY, true);
      }

      if (answer === 'Yes') {
        updateMcpJson();
      }
    });
}

async function updateMcpJson() {
  if (!ensureCursorDirExists()) {
    return false;
  }

  if (hasNxMcpEntry()) {
    return true;
  }

  getTelemetry().logUsage('ai.add-mcp');

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

export function isInCursor() {
  return env.appName.toLowerCase().includes('cursor');
}
