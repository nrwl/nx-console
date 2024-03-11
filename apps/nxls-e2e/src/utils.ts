import { exec, execSync, spawn, spawnSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import {
  ReadableStreamMessageReader,
  WriteableStreamMessageWriter,
} from 'vscode-jsonrpc';
import {
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-languageserver/node';

const defaultVersion = '18.0.4';

export const e2eCwd = '/tmp/nxls-e2e';

export function newWorkspace({
  name = uniq('workspace'),
  packageManager = 'npm',
  version,
  options = {
    preset: 'react-standalone',
    bundler: 'vite',
    e2eTestRunner: 'cypress',
    style: 'css',
  },
}: {
  name?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn';
  preset?: string;
  version?: string;
  options?: {
    preset: string;
    bundler?: string;
    e2eTestRunner?: string;
    style?: string;
  };
} = {}) {
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

  console.log(`setting up new workspace ${name} with command ${command}`);

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

export function startNxls(cwd: string) {
  try {
    const nxlsPath = join(
      __dirname,
      '..',
      '..',
      '..',
      'dist',
      'apps',
      'nxls',
      'main.js'
    );

    console.log('exists?:' + existsSync(nxlsPath));

    const p = spawn(`node ${nxlsPath} --stdio`, {
      env: process.env,
      cwd,
    });

    const messageReader = new StreamMessageReader(p.stdout);
    const messageWriter = new StreamMessageWriter(p.stdin);

    // Example: Initialize connection
    const initMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        processId: p.pid,
        rootUri: null,
        capabilities: {},
      },
    };

    console.log('writing message', initMessage);

    messageWriter.write(initMessage);

    // Handle incoming messages
    messageReader.listen((message) => {
      console.log('Received from server:', message);
    });
  } catch (e) {
    console.error(e);
  }
}
