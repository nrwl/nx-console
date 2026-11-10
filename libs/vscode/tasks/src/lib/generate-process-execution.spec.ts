import { tasks } from 'vscode';
import { CliTaskProvider } from './cli-task-provider';
import { CliTask } from './cli-task';
import { NxTask } from './nx-task';
import {
  getProcessExecutionForConfig,
  getShellExecutionForConfig,
} from '@nx-console/vscode-utils';

jest.mock(
  'vscode',
  () => ({
    Task: class {
      constructor(
        public definition: unknown,
        public scope: unknown,
        public name: string,
        public source: string,
        public execution: unknown,
      ) {}
    },
    TaskScope: { Workspace: 1 },
    tasks: {
      onDidEndTaskProcess: jest.fn(),
      executeTask: jest.fn().mockResolvedValue({}),
    },
  }),
  { virtual: true },
);
jest.mock('@nx-console/vscode-utils', () => ({
  getProcessExecutionForConfig: jest.fn().mockResolvedValue('process'),
  getShellExecutionForConfig: jest.fn().mockResolvedValue('shell'),
}));
jest.mock('@nx-console/shared-schema', () => ({
  WORKSPACE_GENERATOR_NAME_REGEX: /^workspace-(schematic|generator):(.+)/,
}));
jest.mock('@nx-console/shared-npm', () => ({
  getPackageManagerCommand: jest.fn(),
}));
jest.mock('@nx-console/vscode-nx-workspace', () => ({
  getNxWorkspace: jest.fn().mockResolvedValue({
    workspacePath: '/workspace',
    isEncapsulatedNx: false,
  }),
}));
jest.mock('@nx-console/shared-utils', () => ({
  nxLatestProvenanceCheck: jest.fn().mockResolvedValue(true),
}));
jest.mock('@nx-console/vscode-telemetry', () => ({ getTelemetry: jest.fn() }));
jest.mock('@nx-console/vscode-output-channels', () => ({
  vscodeLogger: { log: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

it('routes Generate UI argv, cwd and environment to process execution', async () => {
  const flags = [
    '--description="a \\"',
    '--tags="; touch marker; #"',
    '--dry-run',
  ];
  const task = await CliTask.create({
    command: 'generate',
    positional: '@nx/js:library',
    flags,
    cwd: 'libs',
    env: { CUSTOM: 'value' },
    useProcessExecution: true,
  });
  expect(getProcessExecutionForConfig).toHaveBeenCalledWith(
    expect.objectContaining({
      nxArgs: ['generate', '@nx/js:library', ...flags],
      cwd: '/workspace/libs',
      env: { CUSTOM: 'value' },
    }),
    undefined,
  );
  expect(getShellExecutionForConfig).not.toHaveBeenCalled();
  expect(task.name).toContain('nx generate @nx/js:library');
});

it.each([
  { command: 'generate', useProcessExecution: false },
  { command: 'run', useProcessExecution: true },
])('keeps other CLI tasks on shell execution: %j', async (definition) => {
  await CliTask.create({ ...definition, flags: ['--name=example'] });
  expect(getShellExecutionForConfig).toHaveBeenCalled();
  expect(getProcessExecutionForConfig).not.toHaveBeenCalled();
});

it('runs legacy workspace generators with process arguments', async () => {
  await NxTask.create({
    command: 'workspace-generator',
    positional: 'example',
    flags: ['--tags="a&b"'],
    useProcessExecution: true,
  });
  expect(getProcessExecutionForConfig).toHaveBeenCalledWith(
    expect.objectContaining({
      nxArgs: ['workspace-generator', 'example', '--tags="a&b"'],
    }),
  );
  expect(getShellExecutionForConfig).not.toHaveBeenCalled();
});

it('keeps other Nx tasks on shell execution', async () => {
  await NxTask.create({ command: 'affected', flags: [] });
  expect(getShellExecutionForConfig).toHaveBeenCalled();
  expect(getProcessExecutionForConfig).not.toHaveBeenCalled();
});

it('preserves process execution when a dry run is deferred', async () => {
  const provider = new CliTaskProvider();
  const create = jest.spyOn(CliTask, 'create');
  const first = {
    command: 'generate',
    positional: '@nx/js:library',
    flags: ['--dry-run'],
    useProcessExecution: true,
  };
  const deferred = { ...first, flags: ['--tags="a&b"', '--dry-run'] };
  await provider.executeTask(first);
  await provider.executeTask(deferred);
  expect(create).toHaveBeenCalledTimes(1);
  const finish = jest.mocked(tasks.onDidEndTaskProcess).mock.calls.at(-1)[0];
  finish({} as never);
  expect(create).toHaveBeenLastCalledWith(deferred);
  create.mockRestore();
});

it('forwards the Generate UI execution mode to workspace generators', async () => {
  const provider = new CliTaskProvider();
  const create = jest.spyOn(NxTask, 'create');
  await provider.executeTask({
    command: 'generate',
    positional: 'workspace-generator:example',
    flags: ['--tags="a&b"'],
    cwd: 'libs',
    env: { CUSTOM: 'value' },
    useProcessExecution: true,
  });
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      command: 'workspace-generator',
      positional: 'example',
      flags: ['--tags="a&b"'],
      useProcessExecution: true,
      env: { CUSTOM: 'value' },
    }),
  );
  create.mockRestore();
});
