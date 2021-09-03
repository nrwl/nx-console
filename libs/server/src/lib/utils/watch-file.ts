import { workspace, FileSystemWatcher, GlobPattern } from 'vscode';

/**
 * Watch a file and execute the callback on changes.
 *
 * Make sure to dispose of the filewatcher
 *
 * @param filePath
 * @param callback
 */
export function watchFile(
  filePath: GlobPattern,
  callback: (...args: any[]) => unknown
) {
  const filewatcher = workspace.createFileSystemWatcher(filePath);
  filewatcher.onDidChange(callback);
  return filewatcher;
}
