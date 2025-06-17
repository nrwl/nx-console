import { checkIsNxWorkspace } from '@nx-console/shared-npm';
import {
  getNxWorkspacePath,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode-configuration';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import {
  ensureEditorDirExists,
  getMcpJsonPath,
  getNxMcpPort,
  hasNxMcpEntry,
  isInCursor,
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
import { AgentRulesManager } from './agent-rules-manager';
import { McpWebServer } from './mcp-web-server';
import { findAvailablePort } from './ports';

let mcpJsonWatcher: FileSystemWatcher | null = null;
let hasInitializedMcp = false;

export function startMcpServer() {
  const port = getNxMcpPort();
  if (!port) {
    return;
  }
  McpWebServer.Instance.startSkeletonMcpServer(port).catch((error) => {
    getOutputChannel().appendLine(`Failed to start MCP server: ${error.message}`);
    console.error('MCP Server startup error:', error);
  });
}

export function stopMcpServer() {
  McpWebServer.Instance.stopMcpServer();
}

export async function updateMcpServerWorkspacePath(workspacePath: string) {
  await McpWebServer.Instance.updateMcpServerWorkspacePath(workspacePath);
}

export async function initMcp(context: ExtensionContext) {
  if (hasInitializedMcp) {
    return;
  }

  commands.executeCommand('setContext', 'isInCursor', isInCursor());
  commands.executeCommand('setContext', 'isInWindsurf', isInWindsurf());
  commands.executeCommand('setContext', 'isInVSCode', isInVSCode());

  if (!(await checkIsNxWorkspace(getNxWorkspacePath(), false))) {
    return;
  }
  hasInitializedMcp = true;

  commands.executeCommand('setContext', 'hasNxMcpConfigured', hasNxMcpEntry());

  McpWebServer.Instance.completeMcpServerSetup();

  const rulesManager = new AgentRulesManager(context);

  context.subscriptions.push(
    commands.registerCommand('nx.configureMcpServer', async () => {
      await updateMcpJson();
      await rulesManager.addAgentRulesToWorkspace();
    }),
    commands.registerCommand('nx.addAgentRules', async () => {
      await rulesManager.addAgentRulesToWorkspace();
    }),
  );

  await rulesManager.initialize();

  setupMcpJsonWatcher(context);

  // Wait a bit before showing notification
  await new Promise((resolve) => setTimeout(resolve, 20000));
  await showMCPNotification(rulesManager);
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
      McpWebServer.Instance.stopMcpServer();
      if (port) {
        try {
          await McpWebServer.Instance.startSkeletonMcpServer(port);
        } catch (error: any) {
          getOutputChannel().appendLine(`Failed to restart MCP server on port ${port}: ${error.message}`);
          console.error('MCP Server restart error:', error);
        }
      }
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

async function showMCPNotification(rulesManager: AgentRulesManager) {
  const dontAskAgain = WorkspaceConfigurationStore.instance.get(
    'mcpDontAskAgain',
    false,
  );

  if (dontAskAgain) {
    return;
  }

  if (isInWindsurf()) {
    // TODO: do once windsurf supports project-level mcp servers
    return;
  }

  if (hasNxMcpEntry()) {
    // if mcp is already configured but the rules file isn't, prompt for rules setup
    await rulesManager.showAgentRulesNotification();
    return;
  }

  const msg = isInCursor()
    ? 'Improve Cursor Agents with Nx-specific context?'
    : isInWindsurf()
      ? 'Improve Cascade with Nx-specific context?'
      : 'Improve Copilot Agents with Nx-specific context?';

  window
    .showInformationMessage(msg, 'Yes', "Don't ask again")
    .then(async (answer) => {
      if (answer === "Don't ask again") {
        WorkspaceConfigurationStore.instance.set('mcpDontAskAgain', true);
      }

      if (answer === 'Yes') {
        await updateMcpJson();
        await rulesManager.addAgentRulesToWorkspace();
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
      type: 'http',
      url: `http://localhost:${port}/mcp`,
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

// Functions removed and moved to AgentRulesManager class

// Rules update handling is now managed by AgentRulesManager.setupUpdates
// function ensureMcpEndpoint() {
//   const mcpJson = readMcpJson();
//   if (!mcpJson) {
//     return;
//   }

//   const mcpServer = mcpJson.servers?.['nx-mcp'];
//   if (!mcpServer) {
//     return;
//   }

//   if (mcpServer.url && mcpServer.url.endsWith('/sse')) {
//     mcpServer.url = mcpServer.url.replace('/sse', '/mcp');
//     mcpServer.type = 'http';
//     writeMcpJson(mcpJson);
//   }
// }
