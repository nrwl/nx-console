import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  uniq,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  modifyJsonFile,
} from '../utils';
import { readFileSync } from 'fs';
import { URI } from 'vscode-uri';
import { CompletionList, Position } from 'vscode-languageserver';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const nxJsonPath = join(e2eCwd, workspaceName, 'nx.json');

describe('nx.json completion - 16', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
      packageManager: 'npm',
      version: '16',
    });

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));

    nxlsWrapper.sendNotification({
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: URI.file(nxJsonPath).toString(),
          languageId: 'JSON',
          version: 1,
          text: readFileSync(nxJsonPath, 'utf-8'),
        },
      },
    });
  });

  it('root autocomplete should contain correct items for nx 16', async () => {
    // delete all json properties so we can see all possible completions
    modifyJsonFile(nxJsonPath, (data) => ({}));

    nxlsWrapper.sendNotification({
      method: 'textDocument/didChange',
      params: {
        textDocument: {
          uri: URI.file(nxJsonPath).toString(),
          languageId: 'JSON',
          version: 2,
        },
        contentChanges: [
          {
            text: readFileSync(nxJsonPath, 'utf-8'),
          },
        ],
      },
    });

    const autocompleteResponse = await nxlsWrapper.sendRequest({
      method: 'textDocument/completion',
      params: {
        textDocument: {
          uri: URI.file(nxJsonPath).toString(),
        },
        position: Position.create(0, 1),
      },
    });

    expect(
      (autocompleteResponse.result as CompletionList).items
        .map((item) => item.label)
        .sort()
    ).toMatchInlineSnapshot(`
      Array [
        "affected",
        "cli",
        "defaultProject",
        "generators",
        "implicitDependencies",
        "namedInputs",
        "npmScope",
        "plugins",
        "targetDefaults",
        "targetDependencyConfig",
        "tasksRunnerOptions",
        "workspaceLayout",
      ]
    `);
  });
  it('root autocomplete should not contain newer items', async () => {
    const autocompleteResponse = await nxlsWrapper.sendRequest({
      method: 'textDocument/completion',
      params: {
        textDocument: {
          uri: URI.file(nxJsonPath).toString(),
        },
        position: Position.create(0, 1),
      },
    });

    const labels = (autocompleteResponse.result as CompletionList).items.map(
      (item) => item.label
    );
    expect(labels).not.toContain('nxCloudUrl');
    expect(labels).not.toContain('nxCloudAccessToken');
    expect(labels).not.toContain('release');
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});
