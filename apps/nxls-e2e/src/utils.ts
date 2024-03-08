import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

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

export function startNxls(cwd: string): LanguageClient {
  const serverModule = join('dist', 'nxls', 'main.js');

  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        cwd,
      },
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  const clientOptions: LanguageClientOptions = {
    initializationOptions: {
      workspacePath: cwd,
    },
    documentSelector: [
      { scheme: 'file', language: 'json', pattern: '**/nx.json' },
      { scheme: 'file', language: 'json', pattern: '**/project.json' },
      { scheme: 'file', language: 'json', pattern: '**/workspace.json' },
      { scheme: 'file', language: 'json', pattern: '**/package.json' },
    ],
    synchronize: {},
  };

  const client = new LanguageClient(
    'nxls',
    'nxls',
    serverOptions,
    clientOptions
  );

  client.start();

  process.on('exit', () => client.stop());

  return client;
}
