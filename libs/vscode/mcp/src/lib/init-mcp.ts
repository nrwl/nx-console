import { gte } from '@nx-console/nx-version';
import { isInCursor, isInVSCode, isInWindsurf } from '@nx-console/vscode-utils';
import vscode, {
  commands,
  ExtensionContext,
  lm,
  version,
  window,
} from 'vscode';
import type { McpStreamableWebServer } from './mcp-vscode-server';
import type { McpCursorServer } from './mcp-cursor-server';
import { findAvailablePort } from './ports';
import {
  getNxWorkspacePath,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode-configuration';
import { AgentRulesManager } from './agent-rules-manager';
import { checkIsNxWorkspace } from '@nx-console/shared-npm';
import {
  logAndShowError,
  vscodeLogger,
} from '@nx-console/vscode-output-channels';
import { execSync } from 'child_process';
import {
  getMcpJsonPath,
  hasNxMcpEntry,
  readMcpJson,
  writeMcpJson,
} from '@nx-console/vscode-utils';

let mcpStreamableWebServer: McpStreamableWebServer | undefined;
let mcpCursorServer: McpCursorServer | undefined;
let initialized = false;

export function stopMcpServer() {
  mcpStreamableWebServer?.stopMcpServer();
  mcpCursorServer?.stopMcpServer();
}

export async function updateMcpServerWorkspacePath(workspacePath: string) {
  await mcpStreamableWebServer?.updateMcpServerWorkspacePath(workspacePath);
  await mcpCursorServer?.updateMcpServerWorkspacePath(workspacePath);
}

export async function initMcp(context: ExtensionContext) {
  commands.executeCommand('setContext', 'isInCursor', isInCursor());
  commands.executeCommand('setContext', 'isInWindsurf', isInWindsurf());
  commands.executeCommand('setContext', 'isInVSCode', isInVSCode());

  if (initialized) {
    return;
  }
  initialized = true;

  const inVSCode = isInVSCode();
  const inCursor = isInCursor();

  if (!inVSCode && !inCursor) {
    vscodeLogger.log(
      'Automatic MCP setup is only available for VSCode or Cursor.',
    );
    return;
  }
  if (inVSCode && !gte(version, '1.101.0')) {
    logAndShowError(
      'Nx Console does not support registering the Nx MCP natively on VSCode versions older than 1.101.0. Please update VSCode',
      'Nx Console does not support registering the Nx MCP natively on VSCode versions older than 1.101.0. Please update VSCode. We have to mark Nx Console to be compatible with older versions (even though it is not) because Cursor is based on an older version of VSCode. That is why you are seeing this error.',
    );
    return;
  }

  cleanupOldMcpJson();

  if (inCursor) {
    await initCursorMcp(context);
  } else if (inVSCode) {
    initModernVSCodeMcp(context);
  }

  await setupAgentRules(context);
}

function cleanupOldMcpJson() {
  // if the mcp config file is gitignored, we can safely remove the old manual definition
  const mcpJsonPath = getMcpJsonPath();
  if (mcpJsonPath && hasNxMcpEntry()) {
    const removeOldEntry = () => {
      vscodeLogger.log(`Removing old nx-mcp entry from ${mcpJsonPath}`);
      const mcpJson = readMcpJson();

      if (isInCursor()) {
        delete mcpJson.mcpServers['nx-mcp'];
      } else {
        delete mcpJson.servers['nx-mcp'];
      }
      writeMcpJson(mcpJson);
    };
    if (mcpJsonIsGitIgnored(mcpJsonPath)) {
      removeOldEntry();
    } else {
      if (!WorkspaceConfigurationStore.instance.get('mcpDontAskAgain', false)) {
        // show notification to delete old entry
        window
          .showWarningMessage(
            `Nx Console can now automatically configure the Nx MCP server dynamically. You can remove the old 'nx-mcp' entry from your ${mcpJsonPath} file.`,
            'Remove Entry',
            "Don't ask again",
          )
          .then((selection) => {
            if (selection === 'Remove Entry') {
              removeOldEntry();
            } else if (selection === "Don't ask again") {
              WorkspaceConfigurationStore.instance.set('mcpDontAskAgain', true);
            }
          });
      }
    }
  }
}

async function setupAgentRules(context: ExtensionContext) {
  if (await checkIsNxWorkspace(getNxWorkspacePath())) {
    const rulesManager = new AgentRulesManager(context);

    context.subscriptions.push(
      commands.registerCommand('nx.addAgentRules', async () => {
        await rulesManager.addAgentRulesToWorkspace();
      }),
    );

    await rulesManager.initialize();

    await new Promise((resolve) => setTimeout(resolve, 20000));
    await rulesManager.showAgentRulesNotification();
  }
}

async function initModernVSCodeMcp(context: ExtensionContext) {
  // Dynamic import for VSCode-specific classes
  const { McpStreamableWebServer, NxMcpServerDefinitionProvider } =
    await import('./mcp-vscode-server.js');

  const mcpPort = (await findAvailablePort()) ?? undefined;

  if (mcpPort) {
    mcpStreamableWebServer = new McpStreamableWebServer(mcpPort);
    context.subscriptions.push({
      dispose: () => {
        mcpStreamableWebServer?.stopMcpServer();
      },
    });
    vscodeLogger.log(
      `Automatically configured Nx MCP server dynamically on port ${mcpPort}`,
    );
  }

  context.subscriptions.push(
    lm.registerMcpServerDefinitionProvider(
      'nx-mcp',
      new NxMcpServerDefinitionProvider(mcpStreamableWebServer),
    ),
  );
}

async function initCursorMcp(context: ExtensionContext) {
  // Dynamic import for Cursor-specific server (no VSCode type dependencies)
  const { McpCursorServer } = await import('./mcp-cursor-server.js');

  const mcpPort = (await findAvailablePort()) ?? undefined;

  if (!mcpPort) {
    vscodeLogger.log('Could not find available port for MCP server');
    return;
  }

  // Register with Cursor's MCP API
  if ('cursor' in vscode && 'mcp' in (vscode as any).cursor) {
    mcpCursorServer = new McpCursorServer(mcpPort);
    context.subscriptions.push({
      dispose: () => {
        mcpCursorServer?.stopMcpServer();
      },
    });

    const cursorApi = (vscode as any).cursor;

    cursorApi.mcp.registerServer({
      name: 'nx-mcp',
      server: {
        url: `http://localhost:${mcpPort}/mcp`,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    });

    context.subscriptions.push({
      dispose: () => {
        cursorApi.mcp.unregisterServer('nx-mcp');
      },
    });

    vscodeLogger.log(
      `Registered Nx MCP HTTP server with Cursor on port ${mcpPort}`,
    );
  } else {
    vscodeLogger.log(
      'Cursor MCP API not available, make sure you are on the latest version.',
    );
    return;
  }
}

export function mcpJsonIsGitIgnored(mcpJsonPath: string): boolean {
  try {
    execSync(`git check-ignore "${mcpJsonPath}"`, {
      stdio: 'ignore',
      cwd: getNxWorkspacePath(),
    });
    // If execSync doesn't throw, the file is ignored
    return true;
  } catch {
    // If execSync throws, the file is not ignored
    return false;
  }
}
