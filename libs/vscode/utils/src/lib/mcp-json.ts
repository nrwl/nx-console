import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { parse } from 'jsonc-parser';
import * as path from 'path';
import { isInCursor } from './editor-name-helpers';

/**
 * Gets the path to the mcp.json file.
 * @returns The path to the mcp.json file or null if the workspace path cannot be determined.
 */
export function getMcpJsonPath(): string | null {
  const vscodeWorkspacePath = getNxWorkspacePath();

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
