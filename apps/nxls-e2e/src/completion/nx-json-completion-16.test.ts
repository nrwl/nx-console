import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  uniq,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  modifyJsonFile,
} from '../utils';
import { readFileSync, rmSync } from 'fs';
import { URI } from 'vscode-uri';
import { CompletionList, Position } from 'vscode-languageserver';
import { NxWorkspaceRefreshNotification } from '@nx-console/language-server/types';

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

  it('should contain proper root keys', async () => {
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

  it('should not contain newer root keys', async () => {
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

  it('should not error when nx-schema.json is missing', async () => {
    rmSync(
      join(
        e2eCwd,
        workspaceName,
        'node_modules',
        'nx',
        'schemas',
        'nx-schema.json'
      )
    );

    nxlsWrapper.sendNotification({
      ...NxWorkspaceRefreshNotification,
    });
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );

    const autocompleteResponse = await nxlsWrapper.sendRequest({
      method: 'textDocument/completion',
      params: {
        textDocument: {
          uri: URI.file(nxJsonPath).toString(),
        },
        position: Position.create(0, 1),
      },
    });

    expect(autocompleteResponse.error).toBeUndefined();

    // results should only include non-static completions
    const completionItemStrings = (
      (autocompleteResponse?.result as any).items as any[]
    ).map((item) => item.label);

    expect(completionItemStrings).toContain('tasksRunnerOptions');
    expect(completionItemStrings).toContain('targetDefaults');
    expect(completionItemStrings).toContain('targetDependencyConfig');
    expect(completionItemStrings).toContain('plugins');

    expect(completionItemStrings).not.toContain('nxCloudAccessToken');
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});
