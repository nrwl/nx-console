import { readFileSync } from 'fs';
import { join } from 'path';

const SUPPORTED_KEYS = new Set([
  'tools',
  'minimal',
  'debugLogs',
  'disableTelemetry',
  'transport',
  'port',
  'experimentalPolygraph',
]);

export type NxMcpConfig = {
  tools?: string[];
  minimal?: boolean;
  debugLogs?: boolean;
  disableTelemetry?: boolean;
  transport?: 'stdio' | 'sse' | 'http';
  port?: number;
  experimentalPolygraph?: boolean;
};

export function loadConfigFile(workspacePath: string): NxMcpConfig {
  const configPath = join(workspacePath, '.nx', 'nx-mcp-config.json');

  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf-8');
  } catch {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const config: NxMcpConfig = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (SUPPORTED_KEYS.has(key)) {
      (config as Record<string, unknown>)[key] = value;
    }
  }

  return config;
}

export function configToArgs(config: NxMcpConfig): string[] {
  const args: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'boolean') {
      args.push(value ? `--${key}` : `--no-${key}`);
    } else if (typeof value === 'string' || typeof value === 'number') {
      args.push(`--${key}`, String(value));
    } else if (Array.isArray(value)) {
      for (const item of value) {
        args.push(`--${key}`, String(item));
      }
    }
  }

  return args;
}
