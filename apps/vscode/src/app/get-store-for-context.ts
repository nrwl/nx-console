import { ExtensionContext } from 'vscode';

export function getStoreForContext(context: ExtensionContext) {
  return {
    get: (key: string, defaultValue: any) =>
      context.globalState.get(key) || defaultValue,
    set: (key: string, value: any) => context.globalState.update(key, value),
    delete: (key: string) => context.globalState.update(key, undefined)
  };
}
