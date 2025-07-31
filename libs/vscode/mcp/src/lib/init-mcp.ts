import { gte } from '@nx-console/nx-version';
import {
  getMcpJsonPath,
  hasNxMcpEntry,
  isInCursor,
  isInVSCode,
  isInWindsurf,
  readMcpJson,
  vscodeLogger,
  writeMcpJson,
} from '@nx-console/vscode-utils';
import { commands, ExtensionContext, lm, version, window } from 'vscode';
import {
  initMcpLegacy,
  startMcpServerSkeletonLegacy,
  stopMcpServerLegacy,
  updateMcpServerWorkspacePathLegacy,
} from './init-mcp-legacy';

import type { McpStreamableWebServer } from './mcp-streamable-web-server';

import { findAvailablePort } from './ports';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { execSync } from 'child_process';

let mcpStreamableWebServer: McpStreamableWebServer | undefined;
let initialized = false;

export function startMcpServerSkeleton() {
  if (shouldUseLegacyMcpRegistration()) {
    startMcpServerSkeletonLegacy();
    return;
  }
}

export function stopMcpServer() {
  if (shouldUseLegacyMcpRegistration()) {
    stopMcpServerLegacy();
    return;
  }
  mcpStreamableWebServer?.stopMcpServer();
}

export async function updateMcpServerWorkspacePath(workspacePath: string) {
  if (shouldUseLegacyMcpRegistration()) {
    await updateMcpServerWorkspacePathLegacy(workspacePath);
    return;
  }
  await mcpStreamableWebServer?.updateMcpServerWorkspacePath(workspacePath);
}

export async function initMcp(context: ExtensionContext) {
  commands.executeCommand('setContext', 'isInCursor', isInCursor());
  commands.executeCommand('setContext', 'isInWindsurf', isInWindsurf());
  commands.executeCommand('setContext', 'isInVSCode', isInVSCode());
  commands.executeCommand(
    'setContext',
    'isLegacyMcp',
    shouldUseLegacyMcpRegistration(),
  );

  if (shouldUseLegacyMcpRegistration()) {
    initMcpLegacy(context);
    return;
  }

  if (initialized) {
    return;
  }
  initialized = true;

  // if the mcp config file is gitignored, we can safely remove the old manual definition
  const mcpJsonPath = getMcpJsonPath();
  if (mcpJsonPath && hasNxMcpEntry()) {
    const removeOldEntry = () => {
      vscodeLogger.log(
        `Removing old nx-mcp entry from mcp.json at ${mcpJsonPath}`,
      );
      const mcpJson = readMcpJson();
      delete mcpJson.servers['nx-mcp'];
      writeMcpJson(mcpJson);
    };
    if (mcpJsonIsGitIgnored(mcpJsonPath)) {
      removeOldEntry();
    } else {
      // show notification to delete old entry
      window
        .showWarningMessage(
          "Nx Console can now automatically configure the Nx MCP server dynamically. You can remove the old 'nx-mcp' entry from your mcp.json file.",
          'Remove Entry',
        )
        .then((selection) => {
          if (selection === 'Remove Entry') {
            removeOldEntry();
          }
        });
    }
  }

  // cursor doesn't have these classes so it will error if we don't import them dynamically
  const { McpStreamableWebServer, NxMcpServerDefinitionProvider } =
    await import('./mcp-streamable-web-server.js');

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

  lm.registerMcpServerDefinitionProvider(
    'nx-mcp',
    new NxMcpServerDefinitionProvider(mcpStreamableWebServer),
  );
}

function shouldUseLegacyMcpRegistration(): boolean {
  console.log(version);
  if (isInVSCode() && gte(version, '1.101.0')) {
    return false;
  }
  return true;
}

function mcpJsonIsGitIgnored(mcpJsonPath: string): boolean {
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
