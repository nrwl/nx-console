import { existsSync, readFileSync, rmSync } from 'node:fs';
import type * as vscode from 'vscode';
import { getMarkerFilePath } from './vscode-e2e-runtime';

const POLL_INTERVAL = 500;

export function cleanupMarkerFile(markerId: string): void {
  rmSync(getMarkerFilePath(markerId), { force: true });
}

export class VSCodeEvaluator {
  constructor(private readonly markerId: string) {}

  private serverUrl: string | undefined;

  /**
   * Waits for the HTTP test server running inside VS Code's extension host
   * to write its URL to a marker file.
   */
  async connect(): Promise<void> {
    this.serverUrl = await new Promise<string>((resolve, reject) => {
      const markerFilePath = getMarkerFilePath(this.markerId);
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Timed out waiting for VSCodeTestServer URL at ${markerFilePath}`,
          ),
        );
      }, 60_000);

      const poll = setInterval(() => {
        if (!existsSync(markerFilePath)) return;

        const url = readFileSync(markerFilePath, 'utf-8').trim();
        clearInterval(poll);
        clearTimeout(timeout);
        resolve(url);
      }, POLL_INTERVAL);
    });
  }

  async evaluate<T>(
    fn: (vscodeApi: typeof vscode, ...args: any[]) => T | Promise<T>,
    ...args: unknown[]
  ): Promise<T> {
    if (!this.serverUrl) {
      throw new Error('VSCodeEvaluator not connected. Call connect() first.');
    }

    const response = await fetch(`${this.serverUrl}/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fn: fn.toString(), params: args }),
    });

    const data = (await response.json()) as {
      result?: T;
      error?: { message: string; stack?: string };
    };

    if (data.error) {
      const error = new Error(data.error.message);
      if (data.error.stack) {
        error.stack = data.error.stack;
      }
      throw error;
    }

    return data.result as T;
  }

  close(): void {
    cleanupMarkerFile(this.markerId);
    this.serverUrl = undefined;
  }
}
