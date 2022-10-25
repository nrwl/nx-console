import { workspace, GlobPattern, Disposable, FileSystemWatcher } from 'vscode';
import { debounce } from 'lodash';

type fileChangeCallback = (...args: any[]) => unknown;

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
  disposable?: Disposable[]
): (callback: fileChangeCallback) => FileSystemWatcher {
  return (callback: fileChangeCallback) => {
    const fileWatcher = workspace.createFileSystemWatcher(filePath);
    fileWatcher.onDidChange(
      debounce((...args) => {
        console.log('file changed', filePath);
        callback(args);
      }, 200),
      disposable
    );
    return fileWatcher;
  };
}
