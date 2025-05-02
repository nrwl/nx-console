import { env } from 'vscode';

export function isInCursor() {
  return env.appName.toLowerCase().includes('cursor');
}

export function isInWindsurf() {
  return env.appName.toLowerCase().includes('windsurf');
}

export function isInVSCode() {
  return env.appName.toLowerCase().includes('visual studio code');
}
