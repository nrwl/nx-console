import {
  CancellationToken,
  QuickPickItem,
  QuickPickOptions,
  window
} from 'vscode';

export function mockShowQuickPick<T extends QuickPickItem>(
  handler: (
    items: T[] | Promise<T[]>,
    options?: QuickPickOptions,
    token?: CancellationToken
  ) => Promise<T | undefined>
): () => void {
  const original = window.showQuickPick;
  (window as any).showQuickPick = handler;
  return () => {
    window.showQuickPick = original;
  };
}
