import { spawn } from 'node:child_process';
import type { Readable } from 'node:stream';

export async function startDisplay(
  log: (text: string) => void,
): Promise<{ display?: string; close: () => void }> {
  if (process.platform !== 'linux') return { close() {} };
  const child = spawn(
    'Xvfb',
    ['-displayfd', '3', '-screen', '0', '1920x1080x24', '-nolisten', 'tcp'],
    {
      stdio: ['ignore', 'ignore', 'pipe', 'pipe'],
    },
  );
  child.stderr?.on('data', (data) => log(String(data)));
  const close = () => {
    child.kill('SIGTERM');
  };
  try {
    const display = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        close();
        reject(new Error('Xvfb did not become ready in 15 seconds'));
      }, 15_000);
      let output = '';
      (child.stdio[3] as Readable).on('data', (data) => {
        output += data;
        if (output.includes('\n')) {
          clearTimeout(timer);
          resolve(`:${output.trim()}`);
        }
      });
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Xvfb exited before startup (${code})`));
      });
    });
    return { display, close };
  } catch (error) {
    close();
    throw error;
  }
}
