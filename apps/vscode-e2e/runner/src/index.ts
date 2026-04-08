import * as http from 'node:http';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
import {
  MARKER_DIR,
  getMarkerFilePath,
} from '../../fixtures/vscode-e2e-runtime';

interface InvokeRequest {
  fn: string;
  params: unknown[];
}

interface InvokeResponse {
  result?: unknown;
  error?: { message: string; stack?: string };
}

/**
 * VS Code calls this function via --extensionTestsPath.
 * It must return a Promise that stays pending to keep VS Code alive.
 * When VS Code closes, the process exits and the promise is abandoned.
 */
export function run(): Promise<void> {
  return new Promise<void>((_resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.method !== 'POST' || req.url !== '/invoke') {
        res.writeHead(404);
        res.end();
        return;
      }

      let body = '';
      req.on('data', (chunk: string) => {
        body += chunk;
      });

      req.on('end', async () => {
        let response: InvokeResponse;
        try {
          const { fn, params } = JSON.parse(body) as InvokeRequest;
          const func = new Function('return ' + fn)();
          const result = await func(vscode, ...params);
          response = { result };
        } catch (err) {
          const error = err as Error;
          response = {
            error: { message: error.message, stack: error.stack },
          };
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      });
    });

    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address !== 'string') {
        const url = `http://localhost:${address.port}`;
        const markerId = process.env.VSCODE_E2E_MARKER_ID ?? `${process.pid}`;
        const markerFilePath = getMarkerFilePath(markerId);

        fs.mkdirSync(MARKER_DIR, { recursive: true });
        fs.writeFileSync(markerFilePath, url, 'utf-8');
      }
    });

    server.on('error', (err) => {
      reject(err);
    });

    // Never resolve — keep VS Code alive until the process is killed
  });
}
