import type { PackageManagerCommands } from 'nx/src/utils/package-manager';

export interface ProcessConfig {
  cwd: string;
  workspacePath: string;
  encapsulatedNx: boolean;
  nxArgs: string[];
  useLatestNxVersion?: boolean;
  env?: { [key: string]: string };
}

export function buildProcessExecutionCommand(
  config: ProcessConfig,
  packageManagerCommands: PackageManagerCommands | undefined,
  platform: NodeJS.Platform,
  nxScript?: string,
  pnpFile?: string,
) {
  let executable: string;
  let args: string[];
  if (platform === 'win32') {
    // Batch launchers can reparse arguments through cmd.exe even for process tasks.
    if (!nxScript || config.useLatestNxVersion) {
      throw new Error(
        'Nx Console cannot safely launch this generator on Windows. Install Nx locally in the workspace and use its installed version to run Generate UI.',
      );
    }
    executable = 'node.exe';
    args = [
      ...(pnpFile ? ['--require', pnpFile] : []),
      nxScript,
      ...config.nxArgs,
    ];
  } else if (config.encapsulatedNx && !config.useLatestNxVersion) {
    executable = './nx';
    args = [...config.nxArgs];
  } else {
    const [command, ...prefixArgs] = packageManagerCommands.exec
      .split(/\s+/)
      .filter(Boolean);
    executable = command;
    args = [
      ...prefixArgs,
      config.useLatestNxVersion ? 'nx@latest' : 'nx',
      ...config.nxArgs,
    ];
  }

  const env = { ...config.env, NX_CONSOLE: 'true' };
  if (packageManagerCommands?.install?.includes('pnpm')) {
    env['INIT_CWD'] = config.cwd;
  }
  return { executable, args, options: { cwd: config.cwd, env } };
}
