import {
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { execSync } from 'child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Position } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { NxlsWrapper } from '../nxls-wrapper';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');
const pluginName = uniq('local-plugin');
const workspacePath = join(e2eCwd, workspaceName);
const projectJsonPath = join(
  workspacePath,
  'apps',
  workspaceName,
  'project.json',
);

describe('document links - malformed local executor schema', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: {
        preset: 'next',
      },
    });

    writeFileSync(
      projectJsonPath,
      JSON.stringify(
        {
          targets: {
            build: {},
          },
        },
        null,
        2,
      ),
    );

    execSync('npm install -D @nx/plugin --force', {
      cwd: workspacePath,
      stdio: 'pipe',
    });

    execSync(`npx nx g @nx/plugin:plugin ${pluginName} --no-interactive`, {
      cwd: workspacePath,
      stdio: 'pipe',
    });

    const pluginRoot = join(workspacePath, pluginName);
    const executorRoot = join(pluginRoot, 'src', 'executors', 'my-executor');

    mkdirSync(executorRoot, { recursive: true });

    writeFileSync(
      join(executorRoot, 'executor.ts'),
      `export default async function runExecutor() {
  return { success: true };
}
`,
    );

    writeFileSync(
      join(executorRoot, 'schema.json'),
      JSON.stringify(
        {
          $schema: 'https://json-schema.org/schema',
          version: 2,
          title: 'My executor',
          type: 'object',
          properties: {
            // malformed shape from issue #2050
            inputPath: 'string',
            outputPath: 'string',
          },
          required: ['inputPath', 'outputPath'],
        },
        null,
        2,
      ),
    );

    writeFileSync(
      join(pluginRoot, 'executors.json'),
      JSON.stringify(
        {
          executors: {
            'my-executor': {
              implementation: './src/executors/my-executor/executor.ts',
              schema: './src/executors/my-executor/schema.json',
              description: 'Malformed schema executor',
            },
          },
        },
        null,
        2,
      ),
    );

    modifyJsonFile(join(pluginRoot, 'package.json'), (data) => ({
      ...data,
      executors: './executors.json',
    }));

    modifyJsonFile(projectJsonPath, (data) => ({
      ...data,
      targets: {
        ...data.targets,
        'offending-target': {
          dependsOn: ['build'],
          executor: `@${workspaceName}/${pluginName}:my-executor`,
          options: {
            inputPath: 'path/to/directory/with/things',
            outputPath: 'path/to/directory',
          },
        },
      },
    }));

    nxlsWrapper = new NxlsWrapper(true);
    await nxlsWrapper.startNxls(workspacePath);

    nxlsWrapper.sendNotification({
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: URI.file(projectJsonPath).toString(),
          languageId: 'JSON',
          version: 1,
          text: readFileSync(projectJsonPath, 'utf-8'),
        },
      },
    });
  });

  afterAll(async () => {
    if (nxlsWrapper) {
      await nxlsWrapper.stopNxls();
    }
  });

  it('should not fail documentLink request when local schema is malformed', async () => {
    const linkResponse = await nxlsWrapper.sendRequest({
      method: 'textDocument/documentLink',
      params: {
        textDocument: {
          uri: URI.file(projectJsonPath).toString(),
        },
        position: Position.create(0, 1),
      },
    });

    expect(linkResponse.error).toBeUndefined();
    expect(Array.isArray(linkResponse.result)).toBe(true);
  });
});
