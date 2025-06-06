import { existsSync } from 'fs';
import {
  getMcpJsonPath,
  readMcpJson,
  writeMcpJson,
} from '@nx-console/vscode-utils';

import { isInCursor } from '@nx-console/vscode-utils';

export function refreshMcp() {
  if (!isInCursor()) {
    return;
  }

  // this is a hack for now because cursor doesn't support refreshing the MCP otherwise yet
  // we just rewrite the file to trigger a refresh in cursor
  const mcpJsonPath = getMcpJsonPath();

  if (!mcpJsonPath || !existsSync(mcpJsonPath)) {
    return;
  }

  try {
    const content = readMcpJson();
    if (content) {
      writeMcpJson(content);
    }
  } catch (error) {
    console.error('Error refreshing mcp.json:', error);
  }
}
