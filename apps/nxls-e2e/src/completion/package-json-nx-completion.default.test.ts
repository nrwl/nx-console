import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { URI } from 'vscode-uri';
import { NxlsWrapper } from '../nxls-wrapper';
import { e2eCwd, newWorkspace, uniq } from '@nx-console/shared-e2e-utils';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const packageJsonPath = join(
  e2eCwd,
  workspaceName,
  'apps',
  workspaceName,
  'package.json',
);

describe('package.json nx property completion - default', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: {
        preset: 'react-monorepo',
        bundler: 'vite',
        e2eTestRunner: 'cypress',
        style: 'css',
      },
      packageManager: 'npm',
    });

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
  });

  it('should contain contain properties from project.json schema', async () => {
    writeFileSync(
      packageJsonPath,
      `{
        "nx": {

        }
        }`,
    );

    nxlsWrapper.sendNotification({
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: URI.file(packageJsonPath).toString(),
          languageId: 'JSON',
          version: 1,
          text: readFileSync(packageJsonPath, 'utf-8'),
        },
      },
    });

    const position = { line: 3, character: 1 };

    const autocompleteResponse = await nxlsWrapper.sendRequest({
      method: 'textDocument/completion',
      params: {
        textDocument: {
          uri: URI.file(packageJsonPath).toString(),
        },
        position,
      },
    });

    const completionItemStrings = (
      (autocompleteResponse?.result as any).items as any[]
    ).map((item) => item.label);

    expect(completionItemStrings).toEqual([
      'name',
      'root',
      'sourceRoot',
      'projectType',
      'generators',
      'namedInputs',
      'targets',
      'tags',
      'implicitDependencies',
      'metadata',
      'release',
    ]);
  });

  it('should contain contain dynamic properties', async () => {
    writeFileSync(
      packageJsonPath,
      `
{
  "nx": {
    "implicitDependencies": [
      "${workspaceName}"
    ]
  }
}
        `,
    );

    nxlsWrapper.sendNotification({
      method: 'textDocument/didChange',
      params: {
        textDocument: {
          uri: URI.file(packageJsonPath).toString(),
          languageId: 'JSON',
          version: 2,
        },
        contentChanges: [
          {
            text: readFileSync(packageJsonPath, 'utf-8'),
          },
        ],
      },
    });

    const position = { line: 4, character: 10 };

    const autocompleteResponse = await nxlsWrapper.sendRequest({
      method: 'textDocument/completion',
      params: {
        textDocument: {
          uri: URI.file(packageJsonPath).toString(),
        },
        position,
      },
    });

    const completionItemStrings = (
      (autocompleteResponse?.result as any).items as any[]
    ).map((item) => item.label);

    expect(completionItemStrings).toEqual([
      `"!${workspaceName}"`,
      `"${workspaceName}-e2e"`,
      `"!${workspaceName}-e2e"`,
    ]);
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});
