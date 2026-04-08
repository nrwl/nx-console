import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type * as vscode from 'vscode';

const MARKER_DIR = join(tmpdir(), 'vscode-e2e-test-server');
const POLL_INTERVAL = 500;

/**
 * Clean up any stale marker files from previous runs.
 * Must be called BEFORE launching VS Code.
 */
export function cleanupMarkerFiles(): void {
  if (existsSync(MARKER_DIR)) {
    for (const file of readdirSync(MARKER_DIR)) {
      rmSync(join(MARKER_DIR, file), { force: true });
    }
  }
}

export class VSCodeEvaluator {
  private serverUrl: string | undefined;

  /**
   * Waits for the HTTP test server running inside VS Code's extension host
   * to write its URL to a marker file.
   */
  async connect(): Promise<void> {
    this.serverUrl = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Timed out waiting for VSCodeTestServer URL in ${MARKER_DIR}`,
          ),
        );
      }, 60_000);

      const poll = setInterval(() => {
        if (!existsSync(MARKER_DIR)) return;

        const files = readdirSync(MARKER_DIR).filter((f) => f.endsWith('.url'));
        if (files.length > 0) {
          const url = readFileSync(join(MARKER_DIR, files[0]), 'utf-8').trim();
          clearInterval(poll);
          clearTimeout(timeout);
          resolve(url);
        }
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
    cleanupMarkerFiles();
    this.serverUrl = undefined;
  }
}
