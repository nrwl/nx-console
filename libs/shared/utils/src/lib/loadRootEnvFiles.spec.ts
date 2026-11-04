import { config as loadDotEnvFile } from 'dotenv';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadRootEnvFiles } from './loadRootEnvFiles';

jest.mock('dotenv', () => {
  const actual = jest.requireActual('dotenv');
  return { ...actual, config: jest.fn(actual.config) };
});

describe('loadRootEnvFiles', () => {
  const envFiles = ['.local.env', '.env.local', '.env'];
  const originalEnv = process.env;
  let workspacePath: string;

  beforeEach(() => {
    workspacePath = mkdtempSync(join(tmpdir(), 'nxc-dotenv-'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(workspacePath, { recursive: true, force: true });
  });

  it.each(envFiles)('skips %s when loading is disabled', (file) => {
    writeFileSync(
      join(workspacePath, file),
      'NX_LOAD_DOT_ENV_FILES=true\nNX_DAEMON=true\nNX_NO_CLOUD=false\nNX_MCP_PROBE=loaded\n',
    );
    const env: NodeJS.ProcessEnv = {
      NX_LOAD_DOT_ENV_FILES: 'false',
      NX_DAEMON: 'false',
      NX_NO_CLOUD: 'true',
    };
    const expected = { ...env };

    const result = loadRootEnvFiles(workspacePath, env);

    expect(env).toEqual(expected);
    expect(result).toEqual(expected);
    expect(loadDotEnvFile).not.toHaveBeenCalled();
  });

  it('honours the opt-out in process.env when no environment is supplied', () => {
    writeFileSync(join(workspacePath, '.env'), 'NX_MCP_PROBE=loaded\n');
    process.env = { NX_LOAD_DOT_ENV_FILES: 'false' };
    const expected = { ...process.env };

    expect(loadRootEnvFiles(workspacePath)).toEqual(expected);
    expect(process.env).toEqual(expected);
    expect(loadDotEnvFile).not.toHaveBeenCalled();
  });

  it.each(envFiles)('loads %s by default', (file) => {
    writeFileSync(join(workspacePath, file), 'NX_MCP_PROBE=loaded\n');
    const env: NodeJS.ProcessEnv = {};

    expect(loadRootEnvFiles(workspacePath, env).NX_MCP_PROBE).toBe('loaded');
    expect(env.NX_MCP_PROBE).toBe('loaded');
  });

  it.each(envFiles)('loads %s when explicitly enabled', (file) => {
    writeFileSync(join(workspacePath, file), 'NX_MCP_PROBE=loaded\n');
    const env = { NX_LOAD_DOT_ENV_FILES: 'true' };

    expect(loadRootEnvFiles(workspacePath, env).NX_MCP_PROBE).toBe('loaded');
  });

  it('uses the supplied environment rather than the global opt-out', () => {
    process.env = { NX_LOAD_DOT_ENV_FILES: 'false' };
    writeFileSync(join(workspacePath, '.env'), 'NX_MCP_PROBE=loaded\n');

    expect(loadRootEnvFiles(workspacePath, {}).NX_MCP_PROBE).toBe('loaded');
  });

  it('continues expanding variables when loading is enabled', () => {
    writeFileSync(
      join(workspacePath, '.env'),
      'NX_MCP_PROBE=${NX_MCP_BASE}/suffix\n',
    );

    expect(
      loadRootEnvFiles(workspacePath, { NX_MCP_BASE: 'base' }).NX_MCP_PROBE,
    ).toBe('base/suffix');
  });
});
