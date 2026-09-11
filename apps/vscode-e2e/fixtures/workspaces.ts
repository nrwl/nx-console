import { execFileSync } from 'node:child_process';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { workspaceRoot } from 'nx/src/devkit-exports';

export interface FixtureContext {
  nxCloudUrl?: string;
}

export interface WorkspaceFixture {
  description: string;
  /** VS Code user settings applied on top of the harness defaults. */
  settings?: Record<string, unknown>;
  /** Environment variables for the VS Code process. */
  env?: Record<string, string>;
  create(path: string, context: FixtureContext): void;
}

interface ProjectConfiguration {
  name: string;
  targets?: Record<string, unknown>;
}

const nxVersion: string = require('nx/package.json').version;

function runCommand(command: string) {
  return { executor: 'nx:run-commands', cache: false, options: { command } };
}

export function writeWorkspace(
  path: string,
  {
    projects,
    files = {},
    nxJson = {},
  }: {
    projects: Record<string, ProjectConfiguration>;
    files?: Record<string, string>;
    nxJson?: Record<string, unknown>;
  },
): void {
  const write = (file: string, content: string) => {
    mkdirSync(dirname(join(path, file)), { recursive: true });
    writeFileSync(join(path, file), content);
  };
  const json = (file: string, value: unknown) =>
    write(file, `${JSON.stringify(value, null, 2)}\n`);

  json('package.json', {
    name: 'vscode-automation-fixture',
    private: true,
    devDependencies: { nx: nxVersion },
  });
  json('package-lock.json', {
    name: 'vscode-automation-fixture',
    lockfileVersion: 3,
    packages: { '': { devDependencies: { nx: nxVersion } } },
  });
  json('nx.json', { analytics: false, defaultBase: 'main', ...nxJson });
  for (const [root, project] of Object.entries(projects)) {
    json(join(root, 'project.json'), project);
  }
  for (const [file, content] of Object.entries(files)) {
    write(file, content);
  }
  write('.gitignore', 'node_modules\n.nx\n');
  // Fixtures reuse the repository's installed packages; each one owns its graph, files and Git repository.
  symlinkSync(
    join(workspaceRoot, 'node_modules'),
    join(path, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  for (const args of [
    ['init', '-b', 'main'],
    ['config', 'user.name', 'Nx Console Automation'],
    ['config', 'user.email', 'automation@example.invalid'],
    ['add', '.'],
    ['-c', 'commit.gpgsign=false', 'commit', '-m', 'Automation fixture'],
  ]) {
    execFileSync('git', args, { cwd: path, stdio: 'pipe' });
  }
}

function nxEnv(workspacePath: string): NodeJS.ProcessEnv {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('NX_')),
  );
  return { ...env, NX_WORKSPACE_ROOT_PATH: workspacePath };
}

/** Runs the fixture's Nx CLI without its daemon, e.g. to read the graph Nx Console should render. */
export function runNx(workspacePath: string, args: string[]): string {
  return execFileSync(
    process.execPath,
    [require.resolve('nx/bin/nx'), ...args],
    {
      cwd: workspacePath,
      env: { ...nxEnv(workspacePath), NX_DAEMON: 'false', NX_NO_CLOUD: 'true' },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
    },
  );
}

export function stopNxDaemon(workspacePath: string): void {
  execFileSync(
    process.execPath,
    [require.resolve('nx/bin/nx'), 'daemon', '--stop'],
    {
      cwd: workspacePath,
      env: nxEnv(workspacePath),
      stdio: 'pipe',
      timeout: 30_000,
    },
  );
}

export const nestedProjectParents = [
  {
    name: 'parent-e2e',
    root: 'e2es/parent',
    targets: [] as string[],
    children: [
      { name: 'parent-child-a-e2e', root: 'e2es/parent/child-a-e2e' },
      { name: 'parent-child-b-e2e', root: 'e2es/parent/child-b-e2e' },
    ],
  },
  {
    name: 'parent-with-target-e2e',
    root: 'e2es/parent-with-target',
    targets: ['e2e'],
    children: [
      {
        name: 'parent-with-target-child-c-e2e',
        root: 'e2es/parent-with-target/child-c-e2e',
      },
    ],
  },
];

export const workspaceFixtures: Record<string, WorkspaceFixture> = {
  demo: {
    description: 'One project, `demo`, with `hello` and `check` targets.',
    create: (path) =>
      writeWorkspace(path, {
        projects: {
          demo: {
            name: 'demo',
            targets: {
              hello: runCommand('node demo/hello.cjs'),
              check: runCommand('node demo/hello.cjs'),
            },
          },
        },
        files: {
          'demo/hello.cjs':
            'console.log("Hello from the automation fixture");\n',
        },
      }),
  },
  'nested-projects': {
    description:
      'Projects nested inside other projects under `e2es` (one parent without targets, one with an `e2e` target), plus ten libraries so the automatic Projects view style resolves to the folder tree.',
    create: (path) => {
      const projects: Record<string, ProjectConfiguration> = {};
      for (const parent of nestedProjectParents) {
        projects[parent.root] = {
          name: parent.name,
          targets: Object.fromEntries(
            parent.targets.map((target) => [
              target,
              runCommand(`echo ${target}`),
            ]),
          ),
        };
        for (const child of parent.children) {
          projects[child.root] = {
            name: child.name,
            targets: { e2e: runCommand('echo e2e') },
          };
        }
      }
      for (let index = 1; index <= 10; index++) {
        const name = `lib-${String(index).padStart(2, '0')}`;
        projects[`libs/${name}`] = {
          name,
          targets: { build: runCommand('echo build') },
        };
      }
      writeWorkspace(path, { projects });
    },
  },
};

export function getWorkspaceFixture(name: string): WorkspaceFixture {
  const fixture = workspaceFixtures[name];
  if (!fixture) {
    throw new Error(
      `Unknown workspace fixture "${name}". Available: ${Object.keys(workspaceFixtures).join(', ')}`,
    );
  }
  return fixture;
}
