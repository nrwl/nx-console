import {
  getNxWorkspacePath,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode-configuration';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import {
  ensureEditorDirExists,
  getMcpJsonPath,
  getNxMcpPort,
  hasNxMcpEntry,
  isInVSCode,
  isInWindsurf,
  readMcpJson,
  writeMcpJson,
} from '@nx-console/vscode-utils';
import {
  commands,
  ExtensionContext,
  FileSystemWatcher,
  Uri,
  window,
  workspace,
} from 'vscode';
import { restartMcpServer, tryStartMcpServer } from './mcp-server';
import { findAvailablePort } from './ports';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { checkIsNxWorkspace } from '@nx-console/shared-npm';
import { isInCursor } from '@nx-console/vscode-utils';
const MCP_DONT_ASK_AGAIN_KEY = 'mcpDontAskAgain';

let mcpJsonWatcher: FileSystemWatcher | null = null;
let hasInitializedMcp = false;

export async function initMcp(context: ExtensionContext) {
  if (hasInitializedMcp) {
    return;
  }

  commands.executeCommand('setContext', 'isInCursor', isInCursor());
  commands.executeCommand('setContext', 'isInWindsurf', isInWindsurf());
  commands.executeCommand('setContext', 'isInVSCode', isInVSCode());

  if (!(await checkIsNxWorkspace(getNxWorkspacePath()))) {
    return;
  }
  hasInitializedMcp = true;

  commands.executeCommand('setContext', 'hasNxMcpConfigured', hasNxMcpEntry());

  await tryStartMcpServer(getNxWorkspacePath());

  if (hasNxMcpEntry() && isInCursor()) {
    // cursor is *very* timing-sensitive to the mcp server being available on startup
    // the mcp client creation will often fail
    // we make sure to force a refresh by saving the mcp.json file
    writeMcpJson(readMcpJson());
  }

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

  if (isInWindsurf()) {
    // TODO: do once windsurf supports project-level mcp servers
    return;
  }

  const msg = isInCursor()
    ? 'Improve Cursor Agents with Nx-specific context?'
    : isInWindsurf()
      ? 'Improve Cascade with Nx-specific context?'
      : 'Improve Copilot Agents with Nx-specific context?';

  window
    .showInformationMessage(msg, 'Yes', "Don't ask again")
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
  if (!ensureEditorDirExists()) {
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

  const mcpJson =
    readMcpJson() || (isInCursor() ? { mcpServers: {} } : { servers: {} });

  if (isInCursor()) {
    if (!mcpJson.mcpServers) {
      mcpJson.mcpServers = {};
    }

    mcpJson.mcpServers['nx-mcp'] = {
      url: `http://localhost:${port}/sse`,
    };
  } else {
    if (!mcpJson.servers) {
      mcpJson.servers = {};
    }

    mcpJson.servers['nx-mcp'] = {
      type: 'sse',
      url: `http://localhost:${port}/sse`,
    };
  }

  if (!writeMcpJson(mcpJson)) {
    window.showErrorMessage('Failed to write to mcp.json');
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  commands.executeCommand('vscode.open', Uri.file(getMcpJsonPath()!));

  return true;
}
