import { ExtensionContext, env, window, workspace } from 'vscode';
import { WorkspaceConfigurationStore } from '@nx-console/vscode-configuration';
import * as path from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
const MCP_DONT_ASK_AGAIN_KEY = 'mcpDontAskAgain';

export function initCursor(context: ExtensionContext) {
  if (!env.appName.toLowerCase().includes('cursor')) {
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

  const vscodeWorkspacePath =
    workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;

  if (!vscodeWorkspacePath) {
    return;
  }

  const mcpJsonPath = path.join(vscodeWorkspacePath, '.cursor', 'mcp.json');

  if (existsSync(mcpJsonPath)) {
    try {
      const mcpJson = JSON.parse(readFileSync(mcpJsonPath, 'utf8'));
      if (mcpJson.mcpServers?.['nx-mcp']) {
        return;
      }
    } catch (e) {
      // ignore
    }
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
    updateMcpJson(vscodeWorkspacePath);
  }
}

function updateMcpJson(workspacePath: string) {
  const cursorDirPath = path.join(workspacePath, '.cursor');
  const mcpJsonPath = path.join(cursorDirPath, 'mcp.json');
  let mcpJson: any = { mcpServers: {} };

  if (!existsSync(cursorDirPath)) {
    try {
      mkdirSync(cursorDirPath, { recursive: true });
    } catch (error) {
      window.showErrorMessage(
        `Failed to create .cursor directory: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
  }

  if (existsSync(mcpJsonPath)) {
    try {
      const fileContent = readFileSync(mcpJsonPath, 'utf8');
      if (fileContent.trim() === '') {
        mcpJson = {};
      } else {
        mcpJson = JSON.parse(fileContent);
      }
    } catch (error) {
      window.showErrorMessage(
        `Failed to parse mcp.json: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
  }

  if (!mcpJson.mcpServers) {
    mcpJson.mcpServers = {};
  }

  mcpJson.mcpServers['nx-mcp'] = {
    url: 'http://localhost:3001/sse',
  };

  try {
    writeFileSync(mcpJsonPath, JSON.stringify(mcpJson, null, 2), 'utf8');
  } catch (error) {
    window.showErrorMessage(
      `Failed to write to mcp.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
