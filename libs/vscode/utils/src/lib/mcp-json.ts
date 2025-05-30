import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import * as path from 'path';
import { workspace, window } from 'vscode';
import { parse } from 'jsonc-parser';
import { isInCursor, isInWindsurf } from './editor-name-helpers';

/**
 * Gets the path to the mcp.json file.
 * @returns The path to the mcp.json file or null if the workspace path cannot be determined.
 */
export function getMcpJsonPath(): string | null {
  const vscodeWorkspacePath =
    workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;

  if (!vscodeWorkspacePath) {
    return null;
  }

  if (isInCursor()) {
    // If in cursor, use the .cursor directory
    return path.join(vscodeWorkspacePath, '.cursor', 'mcp.json');
  } // else if (isInWindsurf()) {
  //   TODO: do once windsurf supports project-level mcp servers
  // }
  else {
    // If not in cursor, use the workspace root
    return path.join(vscodeWorkspacePath, '.vscode', 'mcp.json');
  }
}

/**
 * Gets the directory path for the editor folder.
 * @returns The path to the editor directory or null if the workspace path cannot be determined.
 * Return `${workspaceRoot}/.cursor` if in cursor  otherwise `${workspaceRoot}/.vscode`.
 */
export function getEditorDirPath(): string | null {
  const vscodeWorkspacePath =
    workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;

  if (!vscodeWorkspacePath) {
    return null;
  }

  if (isInCursor()) {
    // If in cursor, use the .cursor directory
    return path.join(vscodeWorkspacePath, '.cursor');
  } else {
    // If not in cursor, use use the .vscode directory
    return path.join(vscodeWorkspacePath, '.vscode');
  }
}

/**
 * Checks if the nx-mcp entry exists in the mcp.json file.
 * @returns true if the entry exists, false otherwise.
 */
export function hasNxMcpEntry(): boolean {
  const mcpJsonPath = getMcpJsonPath();

  if (!mcpJsonPath || !existsSync(mcpJsonPath)) {
    return false;
  }

  try {
    const mcpJson = parse(readFileSync(mcpJsonPath, 'utf8'));
    return !!(mcpJson.mcpServers?.['nx-mcp'] ?? mcpJson.servers?.['nx-mcp']);
  } catch (e) {
    return false;
  }
}

/**
 * Reads the mcp.json file.
 * @returns The parsed content of the mcp.json file or null if it doesn't exist or can't be parsed.
 */
export function readMcpJson(): any | null {
  const mcpJsonPath = getMcpJsonPath();

  if (!mcpJsonPath || !existsSync(mcpJsonPath)) {
    return null;
  }

  try {
    const fileContent = readFileSync(mcpJsonPath, 'utf8');
    if (fileContent.trim() === '') {
      return {};
    }
    return parse(fileContent);
  } catch (error) {
    console.error('Error reading mcp.json:', error);
    return null;
  }
}

/**
 * Writes content to the mcp.json file.
 * @param content The content to write to the file.
 * @returns true if successful, false otherwise.
 */
export function writeMcpJson(content: any): boolean {
  const mcpJsonPath = getMcpJsonPath();

  if (!mcpJsonPath) {
    return false;
  }

  try {
    writeFileSync(mcpJsonPath, JSON.stringify(content, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing to mcp.json:', error);
    return false;
  }
}

/**
 * Ensures the .cursor directory exists.
 * @returns true if the directory exists or was created successfully, false otherwise.
 */
export function ensureEditorDirExists(): boolean {
  const editorDirPath = getEditorDirPath();

  if (!editorDirPath) {
    return false;
  }

  if (!existsSync(editorDirPath)) {
    try {
      mkdirSync(editorDirPath, { recursive: true });
    } catch (error) {
      window.showErrorMessage(
        `Failed to create editor directory: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  return true;
}

/**
 * Gets the port number from the nx-mcp entry in mcp.json.
 * @returns The port number or null if it doesn't exist or can't be parsed.
 */
export function getNxMcpPort(): number | undefined {
  if (!hasNxMcpEntry()) {
    return undefined;
  }

  const mcpJson = readMcpJson();
  if (!mcpJson?.mcpServers?.['nx-mcp'] && !mcpJson?.servers?.['nx-mcp']) {
    return undefined;
  }

  try {
    const url =
      mcpJson.mcpServers?.['nx-mcp']?.url ?? mcpJson.servers?.['nx-mcp']?.url;
    if (!url) {
      return undefined;
    }

    // Extract port from URL (format: http://localhost:PORT/sse)
    const match = url.match(/:(\d+)\//);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }

    return undefined;
  } catch (error) {
    console.error('Error extracting port from mcp.json:', error);
    return undefined;
  }
}
