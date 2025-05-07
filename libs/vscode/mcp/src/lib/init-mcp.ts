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
  vscodeLogger,
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
import { ActorRefFrom, createActor, fromPromise, waitFor } from 'xstate';
import { McpWebServer } from './mcp-server';
import { mcpServerMachine } from './mcp-server-machine';
import { findAvailablePort } from './ports';
const MCP_DONT_ASK_AGAIN_KEY = 'mcpDontAskAgain';

let mcpJsonWatcher: FileSystemWatcher | null = null;
let hasInitializedMcp = false;

const mcpWebServer = new McpWebServer();
let mcpActor: ActorRefFrom<typeof mcpServerMachine> | undefined;

export function startMcpMachine() {
  vscodeLogger.log('Starting MCP machine');
  mcpActor = createActor(
    mcpServerMachine.provide({
      actors: {
        startSkeletonServer: fromPromise(
          async ({ input }: { input: { port: number | undefined } }) => {
            if (!input.port) {
              throw new Error('Port is required');
            }
            vscodeLogger.log('Starting skeleton server');
            mcpWebServer.startSkeletonMcpServer(input.port);
          },
        ),
        enhanceSkeletonServer: fromPromise(async () => {
          vscodeLogger.log('Enhancing skeleton server');
          mcpWebServer.enhanceSkeletonMcpServer();
        }),
      },
    }),
  );
  mcpActor.start();
  mcpActor.send({ type: 'START' });
}

export function stopMcpMachine() {
  if (mcpActor) {
    mcpActor.send({ type: 'STOP' });
  }
}

export function updateMcpServerWorkspacePath(workspacePath: string) {
  mcpWebServer.updateMcpServerWorkspacePath(workspacePath);
}

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

  mcpActor?.send({ type: 'ENHANCE' });
  // await tryStartMcpServer(getNxWorkspacePath());

  setupMcpJsonWatcher(context);

  context.subscriptions.push(
    commands.registerCommand('nx.configureMcpServer', async () => {
      await updateMcpJson();
    }),
  );

  await showMCPNotification();
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
      if (mcpActor) {
        mcpActor.send({ type: 'STOP' });
        await waitFor(mcpActor, (snapshot) => snapshot.matches('idle'));
        mcpActor.send({ type: 'START' });
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
