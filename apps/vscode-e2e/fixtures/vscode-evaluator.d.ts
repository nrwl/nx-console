import type * as vscode from 'vscode';
export declare function cleanupMarkerFile(markerId: string): void;
export declare class VSCodeEvaluator {
  private readonly markerId;
  constructor(markerId: string);
  private serverUrl;
  /**
   * Waits for the HTTP test server running inside VS Code's extension host
   * to write its URL to a marker file.
   */
  connect(): Promise<void>;
  evaluate<T>(
    fn: (vscodeApi: typeof vscode, ...args: any[]) => T | Promise<T>,
    ...args: unknown[]
  ): Promise<T>;
  close(): void;
}
//# sourceMappingURL=vscode-evaluator.d.ts.map
