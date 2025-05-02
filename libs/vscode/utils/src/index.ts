export * from './lib/abstract-tree-provider';
export * from './lib/dependency-versioning';
export * from './lib/empty-state-messages';
export { getWorkspacePath } from './lib/get-workspace-path';
export * from './lib/git';
export type { API as GitAPI, GitExtension } from './lib/git-extension';
export {
  isInCursor,
  isInVSCode,
  isInWindsurf,
} from '@nx-console/vscode-utils/src/lib/editor-name-helpers';
export * from './lib/logger';
export * from './lib/mcp-json';
export * from './lib/read-projects';
export * from './lib/register-codelens';
export { sendMessageToAgent } from './lib/send-message-to-agent';
export { getShellExecutionForConfig } from './lib/shell-execution';
export { watchFile } from './lib/watch-file';
