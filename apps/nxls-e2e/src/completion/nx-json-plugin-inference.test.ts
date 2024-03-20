import { NxWorkspaceRequest } from '@nx-console/language-server/types';
import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '../utils';
import { URI } from 'vscode-uri';
import { readFileSync } from 'fs';
import {
  ArrayLiteralExpression,
  ObjectLiteralExpression,
  PropertyAssignment,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
  parseJsonText,
} from 'typescript';
import { text } from 'stream/consumers';
import { version } from 'os';
import { execSync } from 'child_process';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const nxJsonPath = join(e2eCwd, workspaceName, 'nx.json');

describe('nx.json plugins array autocomplete', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
      packageManager: 'npm',
    });

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
  });

  it('should contain preinstalled plugins', async () => {
    modifyJsonFile(nxJsonPath, (data) => ({
      ...data,
      plugins: [
        {
          plugin: '',
        },
      ],
    }));

    await nxlsWrapper.sendNotification({
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

  // This technically works but because the nxls doesn't handle reinstallation well currently,
  // it creates a host of side effect issues that make the test flaky
  // enable when the nxls restart story is better
  xit('should contain playwright plugin after installing it', async () => {
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
