import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ArrayLiteralExpression,
  ObjectLiteralExpression,
  PropertyAssignment,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
  parseJsonText,
} from 'typescript';
import { URI } from 'vscode-uri';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '../utils';
import { Position } from 'vscode-json-languageservice';
import { CompletionList } from 'vscode-languageserver';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const nxJsonPath = join(e2eCwd, workspaceName, 'nx.json');

describe('nx.json completion - default', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
      packageManager: 'npm',
    });

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
  });

  it('plugin autcomplete should contain preinstalled plugins', async () => {
    modifyJsonFile(nxJsonPath, (data) => ({
      ...data,
      plugins: [
        {
          plugin: '',
        },
      ],
    }));

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

    const position = getPluginAutocompletePosition(nxJsonPath);

    const autocompleteResponse = await nxlsWrapper.sendRequest({
      method: 'textDocument/completion',
      params: {
        textDocument: {
          uri: URI.file(nxJsonPath).toString(),
        },
        position,
      },
    });

    const completionItemStrings = (
      (autocompleteResponse?.result as any).items as any[]
    ).map((item) => item.label);

    expect(completionItemStrings).toEqual([
      '@nx/cypress/plugin',
      '@nx/eslint/plugin',
      '@nx/vite/plugin',
    ]);
  });

  it('root autocomplete should contain proper keys', async () => {
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
        "cacheDirectory",
        "cli",
        "defaultBase",
        "defaultProject",
        "generators",
        "implicitDependencies",
        "namedInputs",
        "nxCloudAccessToken",
        "nxCloudEncryptionKey",
        "nxCloudUrl",
        "parallel",
        "plugins",
        "release",
        "targetDefaults",
        "targetDependencyConfig",
        "tasksRunnerOptions",
        "useDaemonProcess",
        "useInferencePlugins",
        "workspaceLayout",
      ]
    `);
  });

  it('root autocomplete should not contain outdated keys', async () => {
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
    expect(labels).not.toContain('npmScope');
    expect(labels).not.toContain('targetDependencies');
  });

  // This technically works but because the nxls doesn't handle reinstallation well currently,
  // it creates a host of side effect issues that make the test flaky
  // enable when the nxls restart story is better
  xit('plugin autocomplete should contain playwright plugin after installing it', async () => {
    execSync('npm install @nx/playwright --save-dev', {
      cwd: join(e2eCwd, workspaceName),
    });

    const position = getPluginAutocompletePosition(nxJsonPath);

    const autocompleteResponse = await nxlsWrapper.sendRequest({
      method: 'textDocument/completion',
      params: {
        textDocument: {
          uri: URI.file(nxJsonPath).toString(),
        },
        position,
      },
    });

    const completionItemStrings = (
      (autocompleteResponse?.result as any).items as any[]
    ).map((item) => item.label);

    expect(completionItemStrings).toEqual([
      '@nx/cypress/plugin',
      '@nx/eslint/plugin',
      '@nx/playwright/plugin',
      '@nx/vite/plugin',
    ]);
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});

function getPluginAutocompletePosition(filePath: string): {
  line: number;
  character: number;
} {
  const jsonFile = parseJsonText(filePath, readFileSync(filePath, 'utf-8'));
  const properties = isObjectLiteralExpression(
    jsonFile.statements[0].expression
  )
    ? jsonFile.statements[0].expression.properties
    : [];
  const pluginsProperty = properties.find(
    (prop) =>
      prop.name && isStringLiteral(prop.name) && prop.name.text === 'plugins'
  );
  const pluginDefinition =
    pluginsProperty && isPropertyAssignment(pluginsProperty)
      ? ((pluginsProperty.initializer as ArrayLiteralExpression)
          .elements[0] as ObjectLiteralExpression)
      : undefined;

  const pluginPropertyValue = (
    pluginDefinition?.properties.find(
      (prop) =>
        prop.name && isStringLiteral(prop.name) && prop.name.text === 'plugin'
    ) as PropertyAssignment
  ).initializer;

  return jsonFile.getLineAndCharacterOfPosition(
    pluginPropertyValue.getStart(jsonFile)
  );
}
