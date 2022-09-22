import { GlobPattern, Disposable } from 'vscode';
/**
 * Watch a file and execute the callback on changes.
 *
 * Make sure to dispose of the filewatcher
 *
 * @param filePath
 * @param callback
 */
export declare function watchFile(filePath: GlobPattern, callback: (...args: any[]) => unknown, disposable?: Disposable[]): import("vscode").FileSystemWatcher;
