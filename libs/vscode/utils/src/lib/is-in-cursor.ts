import { env } from 'vscode';

export function isInCursor() {
  return env.appName.toLowerCase().includes('cursor');
}
