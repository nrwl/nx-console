import { ExtensionContext, env, window } from 'vscode';
import { WorkspaceConfigurationStore } from '@nx-console/vscode-configuration';
import {
  getMcpJsonPath,
  hasNxMcpEntry,
  ensureCursorDirExists,
  readMcpJson,
  writeMcpJson,
} from './mcp-json';

const MCP_DONT_ASK_AGAIN_KEY = 'mcpDontAskAgain';

export function initCursor(context: ExtensionContext) {
  if (!isInCursor()) {
    return;
  }

  showMCPNotification();
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
    updateMcpJson();
  }
}

function updateMcpJson() {
  if (!ensureCursorDirExists()) {
    return;
  }

  const mcpJson = readMcpJson() || { mcpServers: {} };

  if (!mcpJson.mcpServers) {
    mcpJson.mcpServers = {};
  }

  mcpJson.mcpServers['nx-mcp'] = {
    url: 'http://localhost:3001/sse',
  };

  if (!writeMcpJson(mcpJson)) {
    window.showErrorMessage('Failed to write to mcp.json');
  }
}

export function isInCursor() {
  return env.appName.toLowerCase().includes('cursor');
}
