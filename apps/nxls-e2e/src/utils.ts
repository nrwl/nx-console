import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { normalize } from 'path';

const defaultVersion = '18.0.4';

export const e2eCwd = normalize('/tmp/nxls-e2e');

export type NewWorkspaceOptions = {
  preset: string;
  bundler?: string;
  e2eTestRunner?: string;
  style?: string;
};

export const simpleReactWorkspaceOptions: NewWorkspaceOptions = {
  preset: 'react-standalone',
  bundler: 'vite',
  e2eTestRunner: 'cypress',
  style: 'css',
};

export function newWorkspace({
  name = uniq('workspace'),
  packageManager = 'npm',
  version,
  options,
  verbose = false,
}: {
  name?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn';
  preset?: string;
  version?: string;
  options: NewWorkspaceOptions;
  verbose?: boolean;
}) {
  if (!version) {
    version = defaultVersion;
  }

  if (!existsSync(e2eCwd)) {
    mkdirSync(e2eCwd);
  }

  let command = `npx create-nx-workspace@${version} ${name} `;
  Object.entries(options).forEach(([key, value]) => {
    command += `--${key}="${value}" `;
  });
  command += `--nxCloud=skip --pm=${packageManager} --no-interactive`;

  if (verbose) {
    console.log(`setting up new workspace ${name} with ${command}`);
  }

  const create = execSync(command, {
    cwd: e2eCwd,
    stdio: 'pipe',
    env: {
      //   CI: 'true',
      // NX_VERBOSE_LOGGING: isCI ? 'true' : 'false',
      ...process.env,
    },
    encoding: 'utf-8',
  });

  return create;
}

export function uniq(prefix: string) {
  return `${prefix}${Math.floor(Math.random() * 10000000)}`;
}
