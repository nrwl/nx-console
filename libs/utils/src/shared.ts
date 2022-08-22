/**
 * Shared utility functions between vscode and the lsp
 */

export function hasKey<T>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}
