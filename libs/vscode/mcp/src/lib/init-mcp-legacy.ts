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
import {
  AgentRulesManager,
  shouldSkipRulesNotification,
} from './agent-rules-manager';
import { McpWebServer } from './mcp-web-server';
import { mcpJsonIsGitIgnored } from './init-mcp';

let mcpJsonWatcher: FileSystemWatcher | null = null;
let hasInitializedMcp = false;

export function startMcpServerSkeletonLegacy() {
  const port = getNxMcpPort();
  if (!port) {
    return;
  }
  McpWebServer.Instance.startSkeletonMcpServer(port);
}

export function stopMcpServerLegacy() {
  McpWebServer.Instance.stopMcpServer();
}

export async function updateMcpServerWorkspacePathLegacy(
  workspacePath: string,
) {
  await McpWebServer.Instance.updateMcpServerWorkspacePath(workspacePath);
}

export async function initMcpLegacy(context: ExtensionContext) {
  if (hasInitializedMcp) {
    return;
  }

  if (!(await checkIsNxWorkspace(getNxWorkspacePath(), false))) {
    return;
  }
  hasInitializedMcp = true;

  if (hasNxMcpEntry() && canMigrateToStdio()) {
    addStdioNxMcpToMcpJson(true);
  }

  commands.executeCommand('setContext', 'hasNxMcpConfigured', hasNxMcpEntry());

  McpWebServer.Instance.completeMcpServerSetup();

  const rulesManager = new AgentRulesManager(context);

  context.subscriptions.push(
    commands.registerCommand('nx.configureMcpServer', async () => {
      await addStdioNxMcpToMcpJson();
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

function canMigrateToStdio(): boolean {
  const mcpJsonPath = getMcpJsonPath();

  if (!mcpJsonPath) {
    return false;
  }

  return mcpJsonIsGitIgnored(mcpJsonPath);
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
        McpWebServer.Instance.startSkeletonMcpServer(port);
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

// handles different scenarios for showing the mcp & rules notifications
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
    const mcpJson = readMcpJson();

    // if we have do not have an stdio mcp server, prompt to migrate
    if (
      !mcpJson?.servers?.['nx-mcp']?.command &&
      !mcpJson?.mcpServers?.['nx-mcp']?.command
    ) {
      let notificationMessage;
      const shouldSkipRules = shouldSkipRulesNotification();
      if (shouldSkipRules) {
        notificationMessage =
          'Nx MCP can now use stdio for the server communication. This eliminates port conflicts and improves stability. Migrate now?';
      } else {
        notificationMessage = `Would you like to migrate to the recommended Nx MCP setup (stdio server & ${isInVSCode() ? 'conventions file' : 'rules file'})?`;
      }

      window
        .showInformationMessage(notificationMessage, 'Yes', "Don't ask again")
        .then(async (answer) => {
          if (answer === "Don't ask again") {
            WorkspaceConfigurationStore.instance.set('mcpDontAskAgain', true);
          }

          if (answer === 'Yes') {
            await addStdioNxMcpToMcpJson(true);
            await rulesManager.addAgentRulesToWorkspace();
          }
        });
    } else {
      // if mcp is already configured but the rules file isn't, prompt for rules setup
      await rulesManager.showAgentRulesNotification();
    }
    return;
  }

  const msg = isInCursor()
    ? 'Improve Cursor Agents with Nx-specific context? (MCP server & rules file)'
    : isInWindsurf()
      ? 'Improve Cascade with Nx-specific context? (MCP server & rules file)'
      : 'Improve Copilot Agents with Nx-specific context? (MCP server & conventions file)';

  window
    .showInformationMessage(msg, 'Yes', "Don't ask again")
    .then(async (answer) => {
      if (answer === "Don't ask again") {
        WorkspaceConfigurationStore.instance.set('mcpDontAskAgain', true);
      }

      if (answer === 'Yes') {
        await addStdioNxMcpToMcpJson();
        await rulesManager.addAgentRulesToWorkspace();
      }
    });
}

async function addStdioNxMcpToMcpJson(overwrite = false) {
  if (!ensureEditorDirExists()) {
    return false;
  }

  if (hasNxMcpEntry() && !overwrite) {
    return true;
  }

  if (!overwrite) {
    getTelemetry().logUsage('ai.add-mcp');
  }
  const mcpJson =
    readMcpJson() || (isInCursor() ? { mcpServers: {} } : { servers: {} });

  if (isInCursor()) {
    if (!mcpJson.mcpServers) {
      mcpJson.mcpServers = {};
    }

    mcpJson.mcpServers['nx-mcp'] = {
      command: 'npx',
      args: ['-y', 'nx-mcp@latest'],
    };
  } else {
    if (!mcpJson.servers) {
      mcpJson.servers = {};
    }

    mcpJson.servers['nx-mcp'] = {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'nx-mcp@latest', '.'],
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
