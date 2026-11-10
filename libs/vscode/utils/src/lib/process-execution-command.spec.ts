import type { PackageManagerCommands } from 'nx/src/utils/package-manager';
import {
  buildProcessExecutionCommand,
  ProcessConfig,
} from './process-execution-command';

const nxArgs = [
  'generate',
  '@nx/js:library',
  '--name=normal',
  '--description="with spaces"',
  '--quote="a\'b"c"',
  '--dollar="$HOME"',
  '--backtick="`touch marker`"',
  '--description="a \\"',
  '--tags="; touch marker; #"',
  '--newline="a\nb"',
  '--unicode=’hello”',
  '--cmd="%PATH% ^ & | < > !\n"',
];
const config: ProcessConfig = {
  cwd: '/workspace/libs',
  workspacePath: '/workspace',
  encapsulatedNx: false,
  nxArgs,
  env: { CUSTOM: 'value', NX_CONSOLE: 'false' },
};
const pm = (exec: string, install = 'npm install') =>
  ({ exec, install }) as PackageManagerCommands;

describe('buildProcessExecutionCommand', () => {
  it.each([
    ['npx', 'npx', []],
    ['pnpm exec', 'pnpm', ['exec']],
    ['yarn', 'yarn', []],
    ['yarn exec', 'yarn', ['exec']],
    ['bunx', 'bunx', []],
  ])('preserves every argv entry with %s', (prefix, executable, prefixArgs) => {
    const command = buildProcessExecutionCommand(config, pm(prefix), 'linux');
    expect(command.executable).toBe(executable);
    expect(command.args).toEqual([...prefixArgs, 'nx', ...nxArgs]);
    expect(command.options).toEqual({
      cwd: config.cwd,
      env: { CUSTOM: 'value', NX_CONSOLE: 'true' },
    });
  });

  it('preserves pnpm INIT_CWD', () => {
    expect(
      buildProcessExecutionCommand(
        config,
        pm('pnpm exec', 'pnpm install'),
        'linux',
      ).options.env,
    ).toEqual({ CUSTOM: 'value', NX_CONSOLE: 'true', INIT_CWD: config.cwd });
  });

  it('runs encapsulated Nx directly', () => {
    expect(
      buildProcessExecutionCommand(
        { ...config, encapsulatedNx: true },
        undefined,
        'darwin',
      ),
    ).toMatchObject({ executable: './nx', args: nxArgs });
  });

  it.each([false, true])(
    'uses nx@latest even when encapsulated=%s',
    (encapsulatedNx) => {
      expect(
        buildProcessExecutionCommand(
          { ...config, encapsulatedNx, useLatestNxVersion: true },
          pm('npx'),
          'linux',
        ),
      ).toMatchObject({ executable: 'npx', args: ['nx@latest', ...nxArgs] });
    },
  );

  it.each(['npx.cmd', 'pnpm.cmd exec', 'yarn.cmd', 'bunx.exe'])(
    'bypasses %s on Windows',
    (prefix) => {
      expect(
        buildProcessExecutionCommand(
          config,
          pm(prefix),
          'win32',
          'C:\\workspace path\\node_modules\\nx\\bin\\nx.js',
        ),
      ).toMatchObject({
        executable: 'node.exe',
        args: ['C:\\workspace path\\node_modules\\nx\\bin\\nx.js', ...nxArgs],
      });
    },
  );

  it('loads the workspace Yarn PnP runtime before Nx on Windows', () => {
    expect(
      buildProcessExecutionCommand(
        config,
        pm('yarn'),
        'win32',
        'nx.js',
        'C:\\repo\\.pnp.cjs',
      ).args,
    ).toEqual(['--require', 'C:\\repo\\.pnp.cjs', 'nx.js', ...nxArgs]);
  });

  it('bypasses encapsulated nx.bat on Windows', () => {
    expect(
      buildProcessExecutionCommand(
        { ...config, encapsulatedNx: true },
        undefined,
        'win32',
        'C:\\repo\\.nx\\installation\\node_modules\\nx\\bin\\nx.js',
      ),
    ).toMatchObject({
      executable: 'node.exe',
      args: [expect.stringContaining('.nx'), ...nxArgs],
    });
  });

  it.each([undefined, 'C:\\repo\\node_modules\\nx\\bin\\nx.js'])(
    'refuses latest Nx on Windows rather than invoking a batch launcher',
    (nxScript) => {
      expect(() =>
        buildProcessExecutionCommand(
          { ...config, useLatestNxVersion: true },
          pm('npx.cmd'),
          'win32',
          nxScript,
        ),
      ).toThrow('cannot safely launch');
    },
  );

  it('refuses Windows execution when no local Nx script can be resolved', () => {
    expect(() =>
      buildProcessExecutionCommand(config, pm('npx.cmd'), 'win32'),
    ).toThrow('Install Nx locally');
  });
});
