import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const defaultVersion = '18.2.1';

export const e2eCwd = join(
  process.platform === 'darwin' ? join('/', 'private', tmpdir()) : tmpdir(),
  'nxls-e2e'
);
export type NewWorkspaceOptions = {
  preset: string;
  bundler?: string;
  e2eTestRunner?: string;
  style?: string;
  appName?: string;
  framework?: string;
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
  verbose,
}: {
  name?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn';
  preset?: string;
  version?: string;
  options: NewWorkspaceOptions;
  verbose?: boolean;
}) {
  if (verbose === undefined) {
    verbose = !!process.env['CI'];
  }
  if (!version) {
    version = defaultVersion;
  }

  if (!existsSync(e2eCwd)) {
    mkdirSync(e2eCwd, {
      recursive: true,
    });
  }

  let command = `npx create-nx-workspace@${version} ${name} `;
  Object.entries(options).forEach(([key, value]) => {
    command += `--${key}="${value}" `;
  });
  command += `--nxCloud=skip --pm=${packageManager} --no-interactive`;

  if (verbose) {
    console.log(
      `setting up new workspace ${name} with ${command} and env ${JSON.stringify(
        process.env,
        null,
        2
      )} at ${new Date().toISOString()}`
    );
  }

  const create = execSync(command, {
    cwd: e2eCwd,
    stdio: verbose ? 'inherit' : 'pipe',
    env: {
      CI: 'true',
      ...process.env,
    },
    encoding: 'utf-8',
  });

  return create;
}

export function uniq(prefix: string) {
  return `${prefix}${Math.floor(Math.random() * 10000000)}`;
}

export function modifyJsonFile(filePath: string, callback: (data: any) => any) {
  let jsonData = JSON.parse(readFileSync(filePath, 'utf-8'));
  jsonData = callback(jsonData);
  writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
}

export async function waitFor(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isWindows() {
  return process.platform === 'win32';
}
